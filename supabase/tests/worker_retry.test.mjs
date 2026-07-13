/**
 * P5.T8 (queue-substrate half) — failure/retry hardening (Backend §6.6). Transactional / rolled
 * back. The retry *policy* (when to archive vs retry vs dead-letter) is unit-tested in Deno
 * (_shared/retry.test.ts); this drives the real pgmq queue to prove the mechanics that policy
 * relies on, for each fault-injection case:
 *   - transient failure  → worker does NOT archive → pgmq re-delivers after the vt (read_ct++)
 *   - poison / exhausted → after > MAX_ATTEMPTS reads → dead-letter (archive + status=failed)
 *   - permanent failure  → archive on the first read (no wasted retries) + status=failed
 * MAX_ATTEMPTS = 3 (mirrors _shared/retry.ts).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser } from './lib/db.mjs';

const MAX_ATTEMPTS = 3;
const A = '66666666-6666-6666-6666-666666666666';
const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];
const n = async (c, sql, p = []) => (await c.query(sql, p)).rows[0].n;

test('transient failure substrate: read increments read_ct; an un-archived message is re-delivered', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await one(c, `select public.queue_send('scan_jobs', '{"scan_id":"x"}'::jsonb) as id`);

    // vt=0 → the message is immediately visible again; each read bumps read_ct (the retry counter).
    const r1 = await one(c, `select msg_id, read_ct from public.queue_read('scan_jobs', 0, 1)`);
    assert.equal(r1.read_ct, 1, 'first read → read_ct 1');
    const r2 = await one(c, `select msg_id, read_ct from public.queue_read('scan_jobs', 0, 1)`);
    assert.equal(r2.msg_id, r1.msg_id, 'the same message is re-delivered (worker left it un-archived)');
    assert.equal(r2.read_ct, 2, 're-delivery increments read_ct');
    assert.equal(await n(c, `select count(*)::int n from pgmq.q_scan_jobs`), 1, 'un-archived message stays queued');
    assert.equal(await n(c, `select count(*)::int n from pgmq.a_scan_jobs`), 0, 'nothing archived on a transient failure');
  });
});

test('poison / retry-exhausted message → dead-letter (archived + scan failed max_retries)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    const scan = await one(c, `insert into public.scans (user_id,kind,status) values ($1,'palm','extracting') returning id`, [A]);
    await one(c, `select public.queue_send('scan_jobs', $1::jsonb) as id`, [JSON.stringify({ scan_id: scan.id })]);

    // read it MAX_ATTEMPTS+1 times → read_ct crosses the budget (the worker's `exhausted` guard).
    let msg;
    for (let i = 0; i < MAX_ATTEMPTS + 1; i++) msg = await one(c, `select msg_id, read_ct from public.queue_read('scan_jobs', 0, 1)`);
    assert.equal(msg.read_ct, MAX_ATTEMPTS + 1, `read ${MAX_ATTEMPTS + 1}× → read_ct ${MAX_ATTEMPTS + 1} (> MAX_ATTEMPTS)`);

    // dead-letter effect the worker applies: mark scan failed + archive (a_<queue> is the DLQ store).
    await c.query(`update public.scans set status='failed', failure_reason='max_retries' where id=$1`, [scan.id]);
    await one(c, `select public.queue_archive('scan_jobs', $1) as ok`, [msg.msg_id]);

    assert.equal(await n(c, `select count(*)::int n from pgmq.q_scan_jobs`), 0, 'removed from the active queue');
    assert.equal(await n(c, `select count(*)::int n from pgmq.a_scan_jobs`), 1, 'preserved in the archive (dead-letter store)');
    const s = await one(c, `select status, failure_reason from public.scans where id=$1`, [scan.id]);
    assert.equal(s.status, 'failed');
    assert.equal(s.failure_reason, 'max_retries');
  });
});

test('permanent failure → fail fast: archived on the first read + scan failed with the specific reason', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    const scan = await one(c, `insert into public.scans (user_id,kind,status) values ($1,'palm','extracting') returning id`, [A]);
    await one(c, `select public.queue_send('scan_jobs', $1::jsonb) as id`, [JSON.stringify({ scan_id: scan.id })]);

    const msg = await one(c, `select msg_id, read_ct from public.queue_read('scan_jobs', 60, 1)`);
    assert.equal(msg.read_ct, 1, 'first read');
    // a non-hand image cannot be fixed by retrying → archive immediately (no wasted vt cycles).
    await c.query(`update public.scans set status='failed', failure_reason='not_a_hand' where id=$1`, [scan.id]);
    await one(c, `select public.queue_archive('scan_jobs', $1) as ok`, [msg.msg_id]);

    assert.equal(await n(c, `select count(*)::int n from pgmq.q_scan_jobs`), 0, 'not left to burn retries');
    assert.equal((await one(c, `select failure_reason from public.scans where id=$1`, [scan.id])).failure_reason, 'not_a_hand');
  });
});
