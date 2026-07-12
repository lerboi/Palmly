/**
 * P5.T2 (DB-integration half) — the worker-scan DB effects, exercised transactionally against the
 * real schema + pgmq wrappers (migration 0006): enqueue a scan_job → (worker extracts) → store a
 * feature_set → status extracting→narrating → enqueue narrative_jobs → telemetry → archive.
 * The extraction logic + failure modes are covered by the Deno tests (_shared/extraction.test.ts);
 * the live "real image → features" path is gated on test images + a paid Gemini key (H4c).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser } from './lib/db.mjs';

const A = '11111111-1111-1111-1111-111111111111';
const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];
const n = async (c, sql, p = []) => (await c.query(sql, p)).rows[0].n;

test('queue RPC wrappers (queue_send/read/archive) drive pgmq', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await one(c, `select public.queue_send('scan_jobs', '{"scan_id":"x"}'::jsonb) as id`);
    const msg = await one(c, `select * from public.queue_read('scan_jobs', 30, 1)`);
    assert.ok(msg.msg_id, 'read a message');
    assert.equal(msg.message.scan_id, 'x');
    assert.equal((await one(c, `select public.queue_archive('scan_jobs', $1) as ok`, [msg.msg_id])).ok, true);
    assert.equal(await n(c, `select count(*)::int n from pgmq.q_scan_jobs`), 0, 'queue drained');
  });
});

test('worker-scan DB flow: enqueue → store feature_set → narrating → enqueue narrative → telemetry', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A); // trigger provisions the profile

    // a queued scan + its scan_job (what scan-create + scan-ingest produce)
    const scan = await one(
      c,
      `insert into public.scans (user_id, kind, side, status, storage_path)
       values ($1,'palm','left','queued',$2) returning id`,
      [A, `${A}/s1.jpg`],
    );
    await one(c, `select public.queue_send('scan_jobs', $1::jsonb) as id`, [JSON.stringify({ scan_id: scan.id })]);
    const msg = await one(c, `select * from public.queue_read('scan_jobs', 60, 1)`);
    assert.equal(msg.message.scan_id, scan.id);

    // --- worker effects (extraction result simulated; extraction logic proven in Deno tests) ---
    await c.query(`update public.scans set status='extracting' where id=$1`, [scan.id]);
    const fs = await one(
      c,
      `insert into public.feature_sets
         (scan_id, user_id, kind, side, features, feature_schema_version, extractor_version, geometry, feature_hash)
       values ($1,$2,'palm','left', '{"is_hand":true,"hand_shape":"water"}', 1, 'cv1+gemini-3.5-flash+extract.v1',
               '{"heart":{"length":0.6}}', 'deadbeef')
       returning id`,
      [scan.id, A],
    );
    await c.query(`update public.scans set status='narrating' where id=$1`, [scan.id]);
    await one(c, `select public.queue_send('narrative_jobs', $1::jsonb) as id`, [JSON.stringify({ scan_id: scan.id, feature_set_id: fs.id })]);
    await c.query(
      `insert into public.worker_telemetry (worker, queue, msg_id, status, tokens_in, tokens_out, cache_hit)
       values ('worker-scan','scan_jobs',$1,'ok',2000,700,false)`,
      [msg.msg_id],
    );
    await one(c, `select public.queue_archive('scan_jobs', $1) as ok`, [msg.msg_id]);

    // --- assertions ---
    assert.equal((await one(c, `select status from public.scans where id=$1`, [scan.id])).status, 'narrating', 'scan → narrating');
    assert.equal(await n(c, `select count(*)::int n from public.feature_sets where scan_id=$1 and feature_hash='deadbeef'`, [scan.id]), 1, 'feature_set stored');
    assert.equal(await n(c, `select count(*)::int n from pgmq.q_narrative_jobs`), 1, 'narrative_job enqueued');
    assert.equal(await n(c, `select count(*)::int n from public.worker_telemetry where worker='worker-scan' and status='ok'`), 1, 'telemetry written');
    assert.equal(await n(c, `select count(*)::int n from pgmq.q_scan_jobs`), 0, 'scan_job archived');
  });
});
