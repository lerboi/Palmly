/**
 * P7.T1 — account-merge core (Backend §5.1.3). Transactional / rolled back. Proves the
 * `merge_accounts(survivor, loser)` re-parent function: an anonymous loser's rows are re-homed
 * onto the surviving account (conflict-aware for the unique constraints), the guards hold, and
 * deleting the loser afterward cascades clean (no orphans). The Edge Function wrapper (auth +
 * loser deletion) is verified on-device (H1) at launch — this covers the data-integrity core.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser } from './lib/db.mjs';

const S = '77777777-7777-7777-7777-777777777777'; // survivor (permanent)
const L = '88888888-8888-8888-8888-888888888888'; // loser (anonymous)
const T = '99999999-9999-9999-9999-999999999999'; // a third user (compat partner)
const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];
const n = async (c, sql, p = []) => (await c.query(sql, p)).rows[0].n;

const seedFeatureSet = async (c, uid, scanId) =>
  (await one(c, `insert into public.feature_sets (scan_id, user_id, kind, features, feature_schema_version, extractor_version, geometry, feature_hash)
     values ($1,$2,'palm','{}',1,'x','{}',$3) returning id`, [scanId, uid, `h-${scanId.slice(0, 8)}`])).id;

test('merge_accounts re-parents all of the anonymous loser\'s content onto the survivor', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, S, { isAnonymous: false });
    await seedUser(c, L, { isAnonymous: true });

    // survivor already has: a palm_left subject + reading, a subscription, a fortune on day1
    const sScan = (await one(c, `insert into public.scans (user_id,kind,side,status) values ($1,'palm','left','complete') returning id`, [S])).id;
    const sFs = await seedFeatureSet(c, S, sScan);
    await c.query(`insert into public.subject_profiles (user_id, kind, canonical_feature_set_id) values ($1,'palm_left',$2)`, [S, sFs]);
    await c.query(`insert into public.readings (user_id, feature_set_id, kind, narrative, model_id, prompt_version, kb_version) values ($1,$2,'palm','{"headline":"s","sections":[]}','m','p','v1')`, [S, sFs]);
    await c.query(`insert into public.subscriptions (user_id, rc_app_user_id, status) values ($1,$2,'active')`, [S, S]);
    await c.query(`insert into public.user_fortunes (user_id, fortune_date, pillar_bucket) values ($1,'2026-07-13','b1')`, [S]);

    // loser (this device's anon session) has: a palm_left subject (CONFLICT) + a face subject (NEW),
    // a reading, a fortune on day1 (CONFLICT) + day2 (NEW), and an invite it created.
    const lScan = (await one(c, `insert into public.scans (user_id,kind,side,status) values ($1,'palm','left','complete') returning id`, [L])).id;
    const lFs = await seedFeatureSet(c, L, lScan);
    const lFaceScan = (await one(c, `insert into public.scans (user_id,kind,status) values ($1,'face','complete') returning id`, [L])).id;
    const lFaceFs = await seedFeatureSet(c, L, lFaceScan);
    await c.query(`insert into public.subject_profiles (user_id, kind, canonical_feature_set_id) values ($1,'palm_left',$2),($1,'face',$3)`, [L, lFs, lFaceFs]);
    await c.query(`insert into public.readings (user_id, feature_set_id, kind, narrative, model_id, prompt_version, kb_version) values ($1,$2,'palm','{"headline":"l","sections":[]}','m','p','v1')`, [L, lFs]);
    await c.query(`insert into public.user_fortunes (user_id, fortune_date, pillar_bucket) values ($1,'2026-07-13','b1'),($1,'2026-07-14','b2')`, [L]);
    await c.query(`insert into public.invites (inviter_id, token_hash, context) values ($1,'hash-l','{}')`, [L]);

    const res = await one(c, `select public.merge_accounts($1,$2) as r`, [S, L]);
    assert.equal(res.r.merged, true);
    assert.equal(res.r.moved_scans, 2, 'both loser scans moved');

    // all content now under the survivor, none under the loser
    assert.equal(await n(c, `select count(*)::int n from public.scans where user_id=$1`, [S]), 3, 'survivor owns all 3 scans');
    assert.equal(await n(c, `select count(*)::int n from public.scans where user_id=$1`, [L]), 0, 'no scans left under loser');
    assert.equal(await n(c, `select count(*)::int n from public.readings where user_id=$1`, [S]), 2, 'survivor owns both readings');
    assert.equal(await n(c, `select count(*)::int n from public.feature_sets where user_id=$1`, [L]), 0, 'no feature_sets under loser');
    assert.equal((await one(c, `select inviter_id from public.invites where token_hash='hash-l'`)).inviter_id, S, 'invite re-parented');

    // subject_profiles: unique(user_id,kind) respected — survivor keeps palm_left, adopts face
    const kinds = (await c.query(`select kind from public.subject_profiles where user_id=$1 order by kind`, [S])).rows.map((x) => x.kind);
    assert.deepEqual(kinds, ['face', 'palm_left'], 'survivor has exactly palm_left (kept) + face (adopted)');
    assert.equal(await n(c, `select count(*)::int n from public.subject_profiles where user_id=$1`, [L]), 0, 'no subject_profiles under loser');

    // subscriptions: survivor already had one → keep it, drop loser had none
    assert.equal(await n(c, `select count(*)::int n from public.subscriptions where user_id=$1`, [S]), 1, 'survivor keeps its subscription');

    // user_fortunes: pk(user_id,date) — survivor keeps day1, adopts day2
    const days = (await c.query(`select fortune_date::text d from public.user_fortunes where user_id=$1 order by d`, [S])).rows.map((x) => x.d);
    assert.deepEqual(days, ['2026-07-13', '2026-07-14'], 'survivor has day1 (kept) + day2 (adopted)');

    // deleting the anonymous loser now cascades clean — nothing orphaned, survivor intact
    await c.query(`delete from auth.users where id=$1`, [L]);
    assert.equal(await n(c, `select count(*)::int n from public.profiles where id=$1`, [L]), 0, 'loser profile cascade-deleted');
    assert.equal(await n(c, `select count(*)::int n from public.readings where user_id=$1`, [S]), 2, 'survivor readings survive the loser deletion');
  });
});

test('merge_accounts refuses self-merge and non-anonymous losers (theft guard)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, S, { isAnonymous: false });
    await seedUser(c, T, { isAnonymous: false }); // a REAL account, must never be merged away

    // each raise aborts the tx → wrap in a savepoint so the next assertion can run
    const expectReject = async (sql, params, re) => {
      await c.query('savepoint sp');
      await assert.rejects(c.query(sql, params), re);
      await c.query('rollback to savepoint sp');
    };
    await expectReject(`select public.merge_accounts($1,$1) as r`, [S], /into itself/);
    await expectReject(`select public.merge_accounts($1,$2) as r`, [S, T], /not an anonymous account/);
  });
});

test('merge_accounts renormalizes a compatibility pair and drops a would-be duplicate', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, S, { isAnonymous: false });
    await seedUser(c, L, { isAnonymous: true });
    await seedUser(c, T, { isAnonymous: false });

    // loser is paired with T; after merge the pair must become (min(S,T),max(S,T)), still one row.
    const [a1, b1] = [L, T].sort();
    await c.query(`insert into public.compatibility_pairs (user_a,user_b) values ($1,$2)`, [a1, b1]);
    await one(c, `select public.merge_accounts($1,$2) as r`, [S, L]);

    const [ea, eb] = [S, T].sort();
    assert.equal(await n(c, `select count(*)::int n from public.compatibility_pairs where user_a=$1 and user_b=$2`, [ea, eb]), 1, 'pair re-parented + renormalized');
    assert.equal(await n(c, `select count(*)::int n from public.compatibility_pairs where user_a=$1 or user_b=$1`, [L]), 0, 'no pair references the loser');
  });
});
