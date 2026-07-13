/**
 * P8.T5 (worker-compat DB flow) — the end-to-end verify leg: two members with canonical palms →
 * request_compat → computing (+ compat_jobs) → worker stores a full compatibility_results row →
 * complete. Transactional / rolled back. Scoring is proven in compat.test.ts (Deno) and the
 * narrative in compat-narrative.test.ts; here the worker's store effect is exercised against the
 * real schema (the update computing→complete also fires the broadcast trigger, which no-ops
 * without a realtime partition — as in P5.T7).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser } from './lib/db.mjs';

const A = 'ea000000-0000-0000-0000-0000000000a1';
const B = 'eb000000-0000-0000-0000-0000000000b1';
const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];
const n = async (c, sql, p = []) => (await c.query(sql, p)).rows[0].n;

async function seedPalm(c, uid, hand) {
  const scan = await one(c, `insert into public.scans (user_id,kind,side,status) values ($1,'palm','left','complete') returning id`, [uid]);
  const fs = await one(
    c,
    `insert into public.feature_sets (scan_id,user_id,kind,side,features,feature_schema_version,extractor_version,geometry,feature_hash)
     values ($1,$2,'palm','left',$3,1,'x','{}',$4) returning id`,
    [scan.id, uid, JSON.stringify({ hand_shape: hand }), `h-${uid.slice(0, 6)}`],
  );
  await c.query(`insert into public.subject_profiles (user_id,kind,canonical_feature_set_id) values ($1,'palm_left',$2)`, [uid, fs.id]);
  return fs.id;
}

test('worker-compat flow: request → computing → stored complete result with score + narrative + stamps', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    await seedUser(c, B);
    await seedPalm(c, A, 'fire');
    await seedPalm(c, B, 'air');
    const [a, b] = [A, B].sort();
    const pair = await one(c, `insert into public.compatibility_pairs (user_a,user_b) values ($1,$2) returning id`, [a, b]);

    const req = (await one(c, `select public.request_compat($1,$2) as r`, [pair.id, A])).r;
    assert.equal(req.status, 'computing');
    const msg = await one(c, `select msg_id, message from public.queue_read('compat_jobs', 60, 1)`);
    assert.equal(msg.message.result_id, req.result_id);

    // --- worker effect (scoring proven in Deno; DB store exercised here) ---
    await c.query(
      `update public.compatibility_results
         set status='complete', score=78, sub_scores=$2, narrative=$3,
             algorithm_version='compat.v1', model_id='gemini-3.1-flash-lite', prompt_version='compat.v1', kb_version='v1'
       where id=$1`,
      [req.result_id, JSON.stringify({ emotion: 88, mind: 60, life_energy: 74, destiny: 82, elements: 92 }), JSON.stringify({ headline: 'Fire meets Air', sections: [{ key: 'strengths', title: 'x', body: 'y' }] })],
    );
    await one(c, `select public.queue_archive('compat_jobs', $1) as ok`, [msg.msg_id]);

    // --- assertions ---
    const cr = await one(c, `select status, score, sub_scores, narrative, algorithm_version, model_id from public.compatibility_results where id=$1`, [req.result_id]);
    assert.equal(cr.status, 'complete');
    assert.equal(cr.score, 78);
    assert.equal(cr.sub_scores.elements, 92);
    assert.equal(cr.narrative.headline, 'Fire meets Air');
    assert.equal(cr.algorithm_version, 'compat.v1');
    assert.equal(cr.model_id, 'gemini-3.1-flash-lite');
    assert.equal(await n(c, `select count(*)::int n from pgmq.q_compat_jobs`), 0, 'compat job archived');
  });
});
