/**
 * P3.T4 — queues + cron + telemetry (Backend §4 verify): SQL enqueues → the (cron-invoked)
 * stub worker dequeues + archives → a telemetry row is written. Transactional/rolled-back.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations } from './lib/db.mjs';

const QUEUES = ['scan_jobs', 'narrative_jobs', 'compat_jobs', 'push_jobs', 'cleanup_jobs'];
const n = async (c, sql, p = []) => (await c.query(sql, p)).rows[0].n;

test('all 5 queues exist and each has a scheduled cron drain', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    const queues = (await c.query(`select queue_name from pgmq.list_queues()`)).rows.map((r) => r.queue_name);
    for (const q of QUEUES) assert.ok(queues.includes(q), `queue ${q} exists`);

    const jobs = (await c.query(`select command from cron.job`)).rows.map((r) => r.command);
    for (const q of QUEUES) {
      assert.ok(jobs.some((cmd) => cmd.includes(`'${q}'`)), `cron drain scheduled for ${q}`);
    }
  });
});

test('enqueue → stub drains + archives → telemetry row written', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);

    await c.query(`select pgmq.send('scan_jobs', '{"scan_id":"abc"}')`);
    assert.equal(await n(c, `select count(*)::int n from pgmq.q_scan_jobs`), 1, 'message queued');

    const drained = await n(c, `select public.drain_stub('scan_jobs') as n`);
    assert.equal(drained, 1, 'stub drained 1 message');

    assert.equal(await n(c, `select count(*)::int n from pgmq.q_scan_jobs`), 0, 'queue now empty');
    assert.equal(await n(c, `select count(*)::int n from pgmq.a_scan_jobs`), 1, 'message archived');
    assert.equal(
      await n(c, `select count(*)::int n from public.worker_telemetry where queue='scan_jobs' and status='ok'`),
      1,
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
