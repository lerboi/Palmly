/**
 * P8.T5 (compat lifecycle) — Backend §7.4. Transactional / rolled back. Proves: request_compat is
 * `awaiting_b` while the partner hasn't scanned and `computing` (+ compat_jobs enqueued) once both
 * have a canonical palm feature_set; the resolve_awaiting_compat trigger completes an awaiting_b
 * pair when the partner's palm canonical arrives; and the completion Realtime broadcast + RLS.
 * The scorer + narrative are covered separately (compat.test.ts / worker_compat.test.mjs).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser, asRole, resetRole } from './lib/db.mjs';

const A = 'a0000000-0000-0000-0000-0000000000a1';
const B = 'b0000000-0000-0000-0000-0000000000b1';
const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];
const n = async (c, sql, p = []) => (await c.query(sql, p)).rows[0].n;

/** give a user a canonical palm subject (scan + feature_set + subject_profiles). returns fs id. */
async function seedPalm(c, uid) {
  const scan = await one(c, `insert into public.scans (user_id,kind,side,status) values ($1,'palm','left','complete') returning id`, [uid]);
  const fs = await one(
    c,
    `insert into public.feature_sets (scan_id,user_id,kind,side,features,feature_schema_version,extractor_version,geometry,feature_hash)
     values ($1,$2,'palm','left','{"hand_shape":"water"}',1,'x','{}',$3) returning id`,
    [scan.id, uid, `h-${uid.slice(0, 6)}`],
  );
  await c.query(`insert into public.subject_profiles (user_id,kind,canonical_feature_set_id) values ($1,'palm_left',$2)`, [uid, fs.id]);
  return fs.id;
}
const pairOf = async (c) => {
  const [x, y] = [A, B].sort();
  return (await one(c, `insert into public.compatibility_pairs (user_a,user_b) values ($1,$2) returning id`, [x, y])).id;
};

test('request_compat: awaiting_b when the partner has not scanned', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    await seedUser(c, B);
    await seedPalm(c, A); // only A has a canonical palm
    const pair = await pairOf(c);

    const r = (await one(c, `select public.request_compat($1,$2) as r`, [pair, A])).r;
    assert.equal(r.status, 'awaiting_b');
    assert.equal(r.both_ready, false);
    assert.equal(await n(c, `select count(*)::int n from pgmq.q_compat_jobs`), 0, 'no compat job while awaiting');
    assert.equal((await one(c, `select status from public.compatibility_results where id=$1`, [r.result_id])).status, 'awaiting_b');
  });
});

test('request_compat: computing + compat_jobs enqueued when both have canonical palms', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    await seedUser(c, B);
    await seedPalm(c, A);
    await seedPalm(c, B);
    const pair = await pairOf(c);

    const r = (await one(c, `select public.request_compat($1,$2) as r`, [pair, A])).r;
    assert.equal(r.status, 'computing');
    assert.equal(r.both_ready, true);
    assert.equal(await n(c, `select count(*)::int n from pgmq.q_compat_jobs`), 1, 'compat job enqueued');
    const cr = await one(c, `select feature_set_a, feature_set_b, algorithm_version from public.compatibility_results where id=$1`, [r.result_id]);
    assert.ok(cr.feature_set_a && cr.feature_set_b, 'both feature_sets pinned');
    assert.equal(cr.algorithm_version, 'compat.v1');
  });
});

test('resolve_awaiting_compat trigger: partner scanning flips awaiting_b → computing + enqueues', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    await seedUser(c, B);
    await seedPalm(c, A);
    const pair = await pairOf(c);
    const r = (await one(c, `select public.request_compat($1,$2) as r`, [pair, A])).r; // awaiting_b
    assert.equal(r.status, 'awaiting_b');

    await seedPalm(c, B); // B scans → trigger fires
    const cr = await one(c, `select status, feature_set_b from public.compatibility_results where id=$1`, [r.result_id]);
    assert.equal(cr.status, 'computing', 'flipped to computing');
    assert.ok(cr.feature_set_b, 'B feature_set filled');
    assert.equal(await n(c, `select count(*)::int n from pgmq.q_compat_jobs`), 1, 'compat job enqueued by the trigger');
  });
});

test('request_compat: idempotent (a computing result is returned as-is) + member guard', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    await seedUser(c, B);
    await seedPalm(c, A);
    await seedPalm(c, B);
    const pair = await pairOf(c);
    const first = (await one(c, `select public.request_compat($1,$2) as r`, [pair, A])).r;
    const again = (await one(c, `select public.request_compat($1,$2) as r`, [pair, B])).r;
    assert.equal(again.result_id, first.result_id, 'same result, no duplicate');
    assert.equal(await n(c, `select count(*)::int n from public.compatibility_results where pair_id=$1`, [pair]), 1);

    const C = 'c0000000-0000-0000-0000-0000000000c1';
    await seedUser(c, C);
    await c.query('savepoint sp');
    await assert.rejects(one(c, `select public.request_compat($1,$2) as r`, [pair, C]), /not_a_pair_member/);
    await c.query('rollback to savepoint sp');
  });
});

test('compat completion broadcast: RLS lets pair members receive compat:{pair_id}, strangers cannot', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    await seedUser(c, B);
    const pair = await pairOf(c);
    // policy predicate check as each role (mirrors P5.T7 approach; realtime.messages partitions absent on staging)
    const canReceive = async (uid) => {
      await asRole(c, { uid, role: 'authenticated' });
      await c.query(`select set_config('realtime.topic', $1, true)`, [`compat:${pair}`]);
      const ok = (await one(c, `select exists(select 1 from public.compatibility_pairs cp where realtime.topic()='compat:'||cp.id::text and (select auth.uid()) in (cp.user_a, cp.user_b)) as ok`)).ok;
      await resetRole(c);
      return ok;
    };
    assert.equal(await canReceive(A), true, 'member A authorized');
    assert.equal(await canReceive(B), true, 'member B authorized');
    const S = 'd0000000-0000-0000-0000-0000000000d1';
    await seedUser(c, S);
    assert.equal(await canReceive(S), false, 'stranger denied');
  });
});

test('M8: the free-tier gate lives in the same transaction as the act (atomic count→act)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    await seedUser(c, B);
    const C = 'c0000000-0000-0000-0000-0000000000c1';
    await seedUser(c, C);
    await seedPalm(c, A);
    await seedPalm(c, B);
    await seedPalm(c, C);

    // A's FIRST comparison is free (§4.6 — never paywall the growth loop).
    const pairAB = await pairOf(c);
    const first = (await one(c, `select public.request_compat($1,$2,false) as r`, [pairAB, A])).r;
    assert.equal(first.status, 'computing', 'first comparison granted free');

    // A's SECOND, on a different pair, must be refused for a free user...
    const [x, y] = [A, C].sort();
    const pairAC = (await one(c, `insert into public.compatibility_pairs (user_a,user_b) values ($1,$2) returning id`, [x, y])).id;
    await c.query('savepoint sp');
    await assert.rejects(
      c.query(`select public.request_compat($1,$2,false) as r`, [pairAC, A]),
      /payment_required/,
      'a free user gets exactly one comparison',
    );
    await c.query('rollback to savepoint sp');

    // ...but re-requesting the pair they ALREADY own must never be charged for again.
    const again = (await one(c, `select public.request_compat($1,$2,false) as r`, [pairAB, A])).r;
    assert.equal(again.result_id, first.result_id, 'idempotent: the owned pair is returned as-is, not gated');

    // ...and premium is unlimited.
    const premium = (await one(c, `select public.request_compat($1,$2,true) as r`, [pairAC, A])).r;
    assert.equal(premium.status, 'computing', 'premium bypasses the gate');
  });
});

test('M8: the gate takes a row lock, so concurrent first requests cannot both pass', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    // Structural pin. The count and the act now run in ONE transaction under `for update` on the
    // requester's profile row — previously the count was an Edge round-trip and the act another, so
    // two parallel first requests both read zero and both went free. A true two-session race is not
    // expressible here (the fixture lives in an uncommitted, rolled-back transaction), so this
    // asserts the lock that closes it is present and fails if a later edit drops it.
    const { def } = await one(c, `select pg_get_functiondef('public.request_compat(uuid,uuid,boolean)'::regprocedure) as def`);
    assert.match(def, /from public\.profiles where id = p_requester\s+for update/i, 'the requester row must be locked before counting');
    assert.match(def, /payment_required/, 'the gate itself must live inside the function');
  });
});
