/**
 * P5.T3 (DB-invariant half) — repeat-scan consistency at the schema level (Backend §6.6): a hand
 * gets exactly ONE canonical subject_profile + feature_set that repeat scans REUSE (no drift, no
 * new extraction row); a different hand becomes a new subject. The matching + 2-vote decision logic
 * itself is proven in the Deno tests (_shared/consistency.test.ts).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser } from './lib/db.mjs';

const A = '11111111-1111-1111-1111-111111111111';
const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];
const n = async (c, sql, p = []) => (await c.query(sql, p)).rows[0].n;

async function newSubjectScan(c, side) {
  const scan = await one(c, `insert into public.scans (user_id, kind, side, status) values ($1,'palm',$2,'queued') returning id`, [A, side]);
  const fs = await one(
    c,
    `insert into public.feature_sets (scan_id, user_id, kind, side, features, feature_schema_version, extractor_version, geometry, feature_hash)
     values ($1,$2,'palm',$3,'{"is_hand":true}',1,'v1','{}',$4) returning id`,
    [scan.id, A, side, `hash_${side}`],
  );
  await one(c, `insert into public.subject_profiles (user_id, kind, canonical_feature_set_id) values ($1,$2,$3) returning id`, [A, `palm_${side}`, fs.id]);
  return { scan, fs };
}

async function matchedScan(c, side) {
  // worker recognized the same hand: reuse canonical, no new feature_set, count++, status matched
  const scan = await one(c, `insert into public.scans (user_id, kind, side, status) values ($1,'palm',$2,'queued') returning id`, [A, side]);
  await c.query(
    `update public.subject_profiles set scan_count = scan_count + 1, last_matched_at = now() where user_id=$1 and kind=$2`,
    [A, `palm_${side}`],
  );
  await c.query(`update public.scans set status='matched' where id=$1`, [scan.id]);
  return scan;
}

test('same hand scanned 3× → one canonical feature_set reused; different hand → new subject', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);

    await newSubjectScan(c, 'left'); // scan 1: creates the subject
    await matchedScan(c, 'left'); // scan 2: reuse
    await matchedScan(c, 'left'); // scan 3: reuse
    await newSubjectScan(c, 'right'); // a different hand → new subject

    assert.equal(await n(c, `select count(*)::int n from public.subject_profiles where user_id=$1`, [A]), 2, 'two subjects (left + right)');
    assert.equal(await n(c, `select count(*)::int n from public.feature_sets where user_id=$1`, [A]), 2, 'exactly two feature_sets — repeat scans reused, none added');
    assert.equal((await one(c, `select scan_count from public.subject_profiles where user_id=$1 and kind='palm_left'`, [A])).scan_count, 3, 'left hand scan_count = 3');
    assert.equal(await n(c, `select count(*)::int n from public.scans where user_id=$1 and status='matched'`, [A]), 2, 'scans 2-3 short-circuited to matched');
  });
});

test('subject_profiles.unique(user_id,kind) forbids a second canonical for the same hand', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    const { fs } = await newSubjectScan(c, 'left');
    await assert.rejects(
      () => c.query(`insert into public.subject_profiles (user_id, kind, canonical_feature_set_id) values ($1,'palm_left',$2)`, [A, fs.id]),
      /unique|duplicate/i,
      'one canonical subject per (user, hand)',
    );
  });
});
