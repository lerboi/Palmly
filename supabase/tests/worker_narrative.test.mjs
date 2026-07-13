/**
 * P5.T6 (DB-integration half) — worker-narrative DB effects, transactional against the real schema:
 * KB loaded → feature_set stored → narrative_job drained → `readings` row inserted with
 * model/prompt/kb version stamps → scan status → complete → telemetry → archive. The generation
 * logic + failure modes + the identical-claims guarantee are covered by the Deno tests
 * (_shared/narrative.test.ts) and eval/p5t6.ts (5 sets, incl. a live gemini-3.1-flash-lite call).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser, asRole } from './lib/db.mjs';
import { loadKbInto } from '../../kb/load.mjs';

const A = '22222222-2222-2222-2222-222222222222';
const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];
const n = async (c, sql, p = []) => (await c.query(sql, p)).rows[0].n;

// A representative deterministic narrative (what generateNarrative returns for a palm reading).
const NARRATIVE = {
  headline: 'A warm, steady hand',
  summary: 'A grounded, affectionate nature.',
  sections: [
    { key: 'hand_shape', title: 'Your Hand', body: 'An earth hand — grounded and dependable.', depth_level: 1, tags: ['hand_shape.earth'], feature_refs: ['hand_shape.earth'] },
    { key: 'heart', title: 'Your Heart Line', body: 'Deep and warm.', depth_level: 1, tags: ['heart_line.depth.deep'], feature_refs: ['heart_line.depth.deep'] },
  ],
  disclaimer: 'For reflection and entertainment.',
};

test('worker-narrative DB flow: feature_set → narrative_job → readings (stamped) → complete → telemetry', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    await loadKbInto(c); // the KB the worker grounds on

    const scan = await one(
      c,
      `insert into public.scans (user_id, kind, side, status, storage_path)
       values ($1,'palm','left','narrating',$2) returning id`,
      [A, `${A}/s1.jpg`],
    );
    const fs = await one(
      c,
      `insert into public.feature_sets
         (scan_id, user_id, kind, side, features, feature_schema_version, extractor_version, geometry, feature_hash)
       values ($1,$2,'palm','left', '{"is_hand":true,"hand_shape":"earth","heart_line":{"depth":"deep"}}', 1,
               'cv1+gemini-3.5-flash+extract.v1', '{"heart":{"length":0.6}}', 'cafe1234')
       returning id`,
      [scan.id, A],
    );

    // narrative_job enqueued by worker-scan
    await one(c, `select public.queue_send('narrative_jobs', $1::jsonb) as id`, [JSON.stringify({ scan_id: scan.id, feature_set_id: fs.id })]);
    const msg = await one(c, `select * from public.queue_read('narrative_jobs', 60, 1)`);
    assert.equal(msg.message.feature_set_id, fs.id);

    // --- worker effects (generation proven in Deno/eval; DB writes exercised here) ---
    const reading = await one(
      c,
      `insert into public.readings
         (user_id, feature_set_id, kind, narrative, depth_level, model_id, prompt_version, kb_version, tokens_in, tokens_out)
       values ($1,$2,'palm',$3, 1, 'gemini-3.1-flash-lite', 'narrative.v1', 'v1', 3000, 800)
       returning id, model_id, prompt_version, kb_version`,
      [A, fs.id, JSON.stringify(NARRATIVE)],
    );
    await c.query(`update public.scans set status='complete' where id=$1`, [scan.id]);
    await c.query(
      `insert into public.worker_telemetry (worker, queue, msg_id, status, tokens_in, tokens_out, cache_hit)
       values ('worker-narrative','narrative_jobs',$1,'ok',3000,800,false)`,
      [msg.msg_id],
    );
    await one(c, `select public.queue_archive('narrative_jobs', $1) as ok`, [msg.msg_id]);

    // --- assertions ---
    assert.equal(reading.model_id, 'gemini-3.1-flash-lite', 'model stamped');
    assert.equal(reading.prompt_version, 'narrative.v1', 'prompt_version stamped');
    assert.equal(reading.kb_version, 'v1', 'kb_version stamped');
    assert.equal((await one(c, `select status from public.scans where id=$1`, [scan.id])).status, 'complete', 'scan → complete');
    assert.equal(await n(c, `select count(*)::int n from public.readings where feature_set_id=$1`, [fs.id]), 1, 'reading stored');
    assert.equal(await n(c, `select jsonb_array_length(narrative->'sections')::int n from public.readings where id=$1`, [reading.id]), 2, 'narrative sections persisted');
    assert.equal(await n(c, `select count(*)::int n from pgmq.q_narrative_jobs`), 0, 'narrative_job archived');
    assert.equal(await n(c, `select count(*)::int n from public.worker_telemetry where worker='worker-narrative' and status='ok'`), 1, 'telemetry written');
  });
});

test('deterministic keyed KB lookup resolves the feature_keys a reading grounds on', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await loadKbInto(c);
    // the worker looks up each extracted (feature,value) → its passage; prove two hold at the DB layer
    for (const key of ['hand_shape.earth', 'heart_line.depth.deep']) {
      const hit = await one(c, `select content from public.kb_chunks where kb_version='v1' and tradition='palmistry' and feature_key=$1`, [key]);
      assert.ok(hit && hit.content.length >= 20, `keyed lookup ${key} → passage`);
    }
  });
});

test('readings are owner-readable and stranger-private (RLS)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    // feature_sets.scan_id is NOT NULL → insert a scan first, then the feature_set + reading
    const scan = await one(c, `insert into public.scans (user_id, kind, status) values ($1,'palm','complete') returning id`, [A]);
    const realFs = await one(
      c,
      `insert into public.feature_sets (scan_id, user_id, kind, features, feature_schema_version, extractor_version, geometry, feature_hash)
       values ($1,$2,'palm','{}',1,'x','{}','h') returning id`,
      [scan.id, A],
    );
    await one(
      c,
      `insert into public.readings (user_id, feature_set_id, kind, narrative, model_id, prompt_version, kb_version)
       values ($1,$2,'palm','{"headline":"x","sections":[]}','m','p','v1') returning id`,
      [A, realFs.id],
    );

    await asRole(c, { uid: A, role: 'authenticated' });
    assert.equal(await n(c, `select count(*)::int n from public.readings`), 1, 'owner reads own reading');

    const B = '33333333-3333-3333-3333-333333333333';
    await asRole(c, { uid: B, role: 'authenticated' });
    assert.equal(await n(c, `select count(*)::int n from public.readings`), 0, 'stranger sees no readings');
  });
});
