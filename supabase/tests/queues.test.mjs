/**
 * P3.T4 — queues + cron + telemetry (Backend §4 verify): SQL enqueues → the (cron-invoked)
 * stub worker dequeues + archives → a telemetry row is written. Transactional/rolled-back.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations } from './lib/db.mjs';

const QUEUES = ['scan_jobs', 'narrative_jobs', 'compat_jobs', 'push_jobs', 'cleanup_jobs'];
const n = async (c, sql, p = []) => (await c.query(sql, p)).rows[0].n;

test('all 5 queues exist', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    const queues = (await c.query(`select queue_name from pgmq.list_queues()`)).rows.map((r) => r.queue_name);
    for (const q of QUEUES) assert.ok(queues.includes(q), `queue ${q} exists`);
  });
});

test('no cron job invokes the destructive drain_stub (C2)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    // This assertion used to be its inverse ("each queue has a scheduled cron drain") — which
    // encoded the bug: drain_stub archives every message it reads, and nothing consumes these
    // queues, so each scheduled drain silently destroyed real compat/push jobs (0011/0013/0014
    // enqueue them today). Migration 0019 unschedules them until the cron→worker wiring lands.
    // Re-arming a drain_stub cron must fail here.
    const armed = (await c.query(`select jobname, command from cron.job where command like '%drain_stub%'`)).rows;
    assert.deepEqual(armed, [], 'no drain_stub cron may be scheduled while it is a no-op archiver');
  });
});

test('enqueue → stub drains + archives → telemetry row written', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);

    // DELTAS, not absolute counts. `pgmq.a_*` and `worker_telemetry` are shared, long-lived tables
    // on the single staging project, and the live drain crons have been appending to them since
    // migration 0034 went in — so `count(*) == 1` was only ever true on a pristine database. The
    // rows this test creates are what it may assert about; everything else is the world.
    const before = {
      q: await n(c, `select count(*)::int n from pgmq.q_scan_jobs`),
      a: await n(c, `select count(*)::int n from pgmq.a_scan_jobs`),
      t: await n(c, `select count(*)::int n from public.worker_telemetry where queue='scan_jobs' and status='ok'`),
    };

    await c.query(`select pgmq.send('scan_jobs', '{"scan_id":"abc"}')`);
    assert.equal(await n(c, `select count(*)::int n from pgmq.q_scan_jobs`), before.q + 1, 'message queued');

    const drained = await n(c, `select public.drain_stub('scan_jobs') as n`);
    assert.ok(drained >= 1, 'stub drained at least this message');

    assert.equal(await n(c, `select count(*)::int n from pgmq.q_scan_jobs`), 0, 'queue now empty');
    assert.equal(await n(c, `select count(*)::int n from pgmq.a_scan_jobs`), before.a + before.q + 1, 'message archived');
    assert.ok(
      (await n(c, `select count(*)::int n from public.worker_telemetry where queue='scan_jobs' and status='ok'`)) > before.t,
      'telemetry row written',
    );
  });
});

test('draining an empty queue is a safe no-op', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    // Assert a DELTA, not an absolute: the rollback harness hides this test's writes from staging,
    // but it does not hide staging's committed rows from our reads.
    const before = await n(c, `select count(*)::int n from public.worker_telemetry`);
    assert.equal(await n(c, `select public.drain_stub('push_jobs') as n`), 0, 'no messages → 0 drained');
    assert.equal(await n(c, `select count(*)::int n from public.worker_telemetry`), before, 'no telemetry written');
  });
});
