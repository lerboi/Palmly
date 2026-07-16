/**
 * P10.T2 (data lifecycle & erasure) — Backend §9 D2. Transactional / rolled back. The Storage-API
 * object deletion is done by the Edge Functions (untestable without real S3); the DB effects — full
 * account erasure, crop auto-deletion, expired-invite + stale-anon sweeps — are proven here. The
 * erasure test is THE deliverable: a populated account → zero rows across every owned table.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser, asRole, resetRole } from './lib/db.mjs';

const U = 'd1000000-0000-0000-0000-0000000000d1';
const W = 'd2000000-0000-0000-0000-0000000000d2'; // another user (invite counterparty / pair member)
const n = async (c, sql, p = []) => (await c.query(sql, p)).rows[0].n;

/** Populate one row (owned by `uid`) in every user-scoped table; returns captured ids. */
async function populate(c, uid) {
  const scan = (await c.query(`insert into public.scans (user_id, kind, status, storage_path) values ($1,'palm','complete',$2) returning id`, [uid, `${uid}/s.jpg`])).rows[0].id;
  const fs = (
    await c.query(
      `insert into public.feature_sets (scan_id, user_id, kind, features, feature_schema_version, extractor_version, geometry, feature_hash)
       values ($1,$2,'palm','{}'::jsonb,1,'x','{}'::jsonb,'h') returning id`,
      [scan, uid],
    )
  ).rows[0].id;
  const reading = (await c.query(`insert into public.readings (user_id, feature_set_id, kind, narrative, model_id, prompt_version, kb_version) values ($1,$2,'palm','{}'::jsonb,'m','p','v1') returning id`, [uid, fs])).rows[0].id;
  await c.query(`insert into public.subject_profiles (user_id, kind, canonical_feature_set_id) values ($1,'palm_left',$2)`, [uid, fs]);
  await c.query(`insert into public.subscriptions (user_id, rc_app_user_id) values ($1,$2)`, [uid, uid]);
  await c.query(`insert into public.subscription_events (user_id, type, payload) values ($1,'INITIAL','{}'::jsonb)`, [uid]);
  await c.query(`insert into public.devices (user_id, expo_push_token, platform) values ($1,$2,'ios')`, [uid, `tok-${uid.slice(0, 8)}`]);
  const thread = (await c.query(`insert into public.chat_threads (user_id, reading_id) values ($1,$2) returning id`, [uid, reading])).rows[0].id;
  await c.query(`insert into public.chat_messages (thread_id, role, content) values ($1,'user','hi'),($1,'assistant','hello')`, [thread]);
  await c.query(`insert into public.share_cards (user_id, source_type, source_id, variant, locale, storage_path) values ($1,'reading',$2,'feed_4x5','en',$3)`, [uid, reading, `${uid}/card.png`]);
  await c.query(`insert into public.user_fortunes (user_id, fortune_date, pillar_bucket) values ($1,'2026-07-13','jiazi')`, [uid]);
  return { scan, fs, reading, thread };
}

test('ERASURE: purge_account leaves zero rows across every owned table', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    await seedUser(c, W);
    const { thread } = await populate(c, U);
    // U is inviter of one invite; W invited U (so U is the invitee — the no-cascade FK case).
    await c.query(`insert into public.invites (inviter_id, token_hash) values ($1,'hashU')`, [U]);
    const wInvite = (await c.query(`insert into public.invites (inviter_id, invitee_id, token_hash, status) values ($1,$2,'hashW','accepted') returning id`, [W, U])).rows[0].id;
    // a canonical pair (U,W) + a result
    const [a, b] = U < W ? [U, W] : [W, U];
    const pair = (await c.query(`insert into public.compatibility_pairs (user_a, user_b) values ($1,$2) returning id`, [a, b])).rows[0].id;
    await c.query(`insert into public.compatibility_results (pair_id, algorithm_version) values ($1,'compat.v1')`, [pair]);

    const paths = (await c.query(`select bucket, path from public.purge_account($1) order by bucket`, [U])).rows;
    assert.deepEqual(paths.map((r) => `${r.bucket}:${r.path}`), [`cards:${U}/card.png`, `scans:${U}/s.jpg`], 'returns storage paths for the Edge fn to purge');

    // zero rows for U across every owned table
    for (const [table, where] of [
      ['profiles', 'id'], ['scans', 'user_id'], ['feature_sets', 'user_id'], ['subject_profiles', 'user_id'],
      ['readings', 'user_id'], ['subscriptions', 'user_id'], ['subscription_events', 'user_id'],
      ['devices', 'user_id'], ['chat_threads', 'user_id'], ['share_cards', 'user_id'], ['user_fortunes', 'user_id'],
    ]) {
      assert.equal(await n(c, `select count(*)::int n from public.${table} where ${where}=$1`, [U]), 0, `${table} erased`);
    }
    assert.equal(await n(c, `select count(*)::int n from public.chat_messages where thread_id=$1`, [thread]), 0, 'chat_messages cascaded');
    assert.equal(await n(c, `select count(*)::int n from public.compatibility_pairs where user_a=$1 or user_b=$1`, [U]), 0, 'pairs cascaded');
    assert.equal(await n(c, `select count(*)::int n from public.compatibility_results`), 0, 'results cascaded with the pair');
    assert.equal(await n(c, `select count(*)::int n from auth.users where id=$1`, [U]), 0, 'auth.users row gone');
    // U's own invite gone; W's invite survives with invitee released (a stranger's data is preserved)
    assert.equal(await n(c, `select count(*)::int n from public.invites where inviter_id=$1`, [U]), 0, "U's invite gone");
    const w = (await c.query(`select invitee_id from public.invites where id=$1`, [wInvite])).rows[0];
    assert.equal(w.invitee_id, null, "W's invite survives with invitee_id released");
    // audit + counterparty intact
    assert.equal(await n(c, `select count(*)::int n from public.deletion_log where user_id=$1 and scope='account'`, [U]), 1, 'deletion_log audit written');
    assert.equal(await n(c, `select count(*)::int n from auth.users where id=$1`, [W]), 1, 'counterparty W untouched');
  });
});

test('crop auto-deletion: >24h terminal crops are due; kept + fresh are exempt', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    const old = (await c.query(`insert into public.scans (user_id, kind, status, storage_path, created_at) values ($1,'palm','complete',$2, now()-interval '25 hours') returning id`, [U, `${U}/old.jpg`])).rows[0].id;
    await c.query(`insert into public.scans (user_id, kind, status, storage_path, keep_image, created_at) values ($1,'palm','complete',$2, true, now()-interval '25 hours')`, [U, `${U}/kept.jpg`]);
    await c.query(`insert into public.scans (user_id, kind, status, storage_path, created_at) values ($1,'palm','complete',$2, now()-interval '1 hour')`, [U, `${U}/fresh.jpg`]);

    const due = (await c.query(`select scan_id, storage_path from public.crops_due_for_deletion(200)`)).rows;
    assert.equal(due.length, 1, 'only the old, un-kept crop is due');
    assert.equal(due[0].scan_id, old);

    await c.query(`select public.mark_crop_deleted($1)`, [old]);
    const row = (await c.query(`select storage_path, image_deleted_at from public.scans where id=$1`, [old])).rows[0];
    assert.equal(row.storage_path, null, 'path nulled');
    assert.ok(row.image_deleted_at, 'image_deleted_at set (D2 audit)');
    assert.equal((await c.query(`select count(*)::int n from public.crops_due_for_deletion(200)`)).rows[0].n, 0, 'not due again once marked');
  });
});

test('crop auto-deletion: a scan abandoned in ANY non-terminal state is swept (C4)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    // The old predicate filtered `status in ('complete','matched','failed')`, so a scan abandoned in
    // any of these four kept its crop FOREVER — contradicting the D2 promise ("analyzed, then
    // deleted — usually within a day"). 'narrating' is the one the audit itself missed.
    const STUCK = ['uploaded', 'queued', 'extracting', 'narrating'];
    for (const s of STUCK) {
      await c.query(
        `insert into public.scans (user_id, kind, status, storage_path, created_at)
         values ($1,'palm',$2,$3, now()-interval '25 hours')`,
        [U, s, `${U}/stuck-${s}.jpg`],
      );
    }
    const due = (await c.query(`select storage_path from public.crops_due_for_deletion(200)`)).rows.map((r) => r.storage_path);
    for (const s of STUCK) {
      assert.ok(due.includes(`${U}/stuck-${s}.jpg`), `a scan stuck in '${s}' for 25h must be swept`);
    }
  });
});

test('crop auto-deletion: a failed scan is swept immediately, not after 24h (C4)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    // Spec §9: "Deleted immediately on scan failure resolution." status='failed' is terminal —
    // worker-scan sets it only on the fail-fast/dead-letter branch, never to retry.
    await c.query(
      `insert into public.scans (user_id, kind, status, storage_path, created_at)
       values ($1,'palm','failed',$2, now()-interval '1 minute')`,
      [U, `${U}/failed-now.jpg`],
    );
    // ...but an opted-in crop is still exempt (§9 "Opt-in retained scan — until revoked").
    await c.query(
      `insert into public.scans (user_id, kind, status, storage_path, keep_image, created_at)
       values ($1,'palm','failed',$2, true, now()-interval '1 minute')`,
      [U, `${U}/failed-kept.jpg`],
    );
    const due = (await c.query(`select storage_path from public.crops_due_for_deletion(200)`)).rows.map((r) => r.storage_path);
    assert.ok(due.includes(`${U}/failed-now.jpg`), 'a fresh failed scan is due immediately');
    assert.ok(!due.includes(`${U}/failed-kept.jpg`), 'keep_image still exempts a failed scan');
  });
});

test('request_image_deletion: marks all the user\'s crops + returns paths + audits', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    await c.query(`insert into public.scans (user_id, kind, status, storage_path) values ($1,'palm','complete',$2),($1,'face','complete',$3)`, [U, `${U}/a.jpg`, `${U}/b.jpg`]);
    const paths = (await c.query(`select path from public.request_image_deletion($1) order by path`, [U])).rows.map((r) => r.path);
    assert.deepEqual(paths, [`${U}/a.jpg`, `${U}/b.jpg`]);
    assert.equal(await n(c, `select count(*)::int n from public.scans where user_id=$1 and storage_path is not null`, [U]), 0, 'all paths nulled');
    assert.equal(await n(c, `select count(*)::int n from public.deletion_log where user_id=$1 and scope='images'`, [U]), 1);
  });
});

test('sweep_expired_invites: past-due open invites expire; future ones stay', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    await c.query(`insert into public.invites (inviter_id, token_hash, status, expires_at) values ($1,'h1','created', now()-interval '1 day'),($1,'h2','clicked', now()-interval '1 hour'),($1,'h3','created', now()+interval '1 day'),($1,'h4','accepted', now()-interval '1 day')`, [U]);
    const swept = (await c.query(`select public.sweep_expired_invites() as n`)).rows[0].n;
    assert.equal(swept, 2, 'two open past-due invites expired');
    assert.equal(await n(c, `select count(*)::int n from public.invites where inviter_id=$1 and status='expired'`, [U]), 2);
    assert.equal(await n(c, `select count(*)::int n from public.invites where inviter_id=$1 and status='accepted'`, [U]), 1, 'accepted is not touched');
  });
});

test('sweep_stale_anon: >30d anon with no readings is erased; others survive', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    const stale = 'd3000000-0000-0000-0000-0000000000d3';
    const anonWithReading = 'd4000000-0000-0000-0000-0000000000d4';
    const freshAnon = 'd5000000-0000-0000-0000-0000000000d5';
    const oldPermanent = 'd6000000-0000-0000-0000-0000000000d6';
    await seedUser(c, stale, { isAnonymous: true });
    await seedUser(c, anonWithReading, { isAnonymous: true });
    await seedUser(c, freshAnon, { isAnonymous: true });
    await seedUser(c, oldPermanent, { isAnonymous: false });
    await c.query(`update auth.users set created_at = now()-interval '40 days' where id = any($1)`, [[stale, anonWithReading, oldPermanent]]);
    // give anonWithReading a reading (→ engaged, must survive)
    const scan = (await c.query(`insert into public.scans (user_id, kind, status) values ($1,'palm','complete') returning id`, [anonWithReading])).rows[0].id;
    const fs = (await c.query(`insert into public.feature_sets (scan_id, user_id, kind, features, feature_schema_version, extractor_version, geometry, feature_hash) values ($1,$2,'palm','{}'::jsonb,1,'x','{}'::jsonb,'h') returning id`, [scan, anonWithReading])).rows[0].id;
    await c.query(`insert into public.readings (user_id, feature_set_id, kind, narrative, model_id, prompt_version, kb_version) values ($1,$2,'palm','{}'::jsonb,'m','p','v1')`, [anonWithReading, fs]);

    const swept = (await c.query(`select public.sweep_stale_anon(30) as n`)).rows[0].n;
    assert.equal(swept, 1, 'only the stale, reading-less anon is swept');
    assert.equal(await n(c, `select count(*)::int n from auth.users where id=$1`, [stale]), 0, 'stale anon erased');
    for (const id of [anonWithReading, freshAnon, oldPermanent]) {
      assert.equal(await n(c, `select count(*)::int n from auth.users where id=$1`, [id]), 1, `${id} survives`);
    }
  });
});

test('sweep_stale_anon: a stale anon in a compatibility pair is NOT swept — the partner keeps their pair + result (H10)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    const inviter = 'd7000000-0000-0000-0000-0000000000d7'; // a real, active user
    const staleInvitee = 'd8000000-0000-0000-0000-0000000000d8'; // anon, 40d, no readings
    await seedUser(c, inviter, { isAnonymous: false });
    await seedUser(c, staleInvitee, { isAnonymous: true });
    await c.query(`update auth.users set created_at = now()-interval '40 days' where id = any($1)`, [[inviter, staleInvitee]]);

    // The pair the inviter owns a half of. Both compatibility_pairs FKs are ON DELETE CASCADE to
    // profiles, and compatibility_results cascades from the pair — so before this fix, sweeping the
    // invitee silently destroyed the INVITER's pair and result.
    const [a, b] = inviter < staleInvitee ? [inviter, staleInvitee] : [staleInvitee, inviter];
    const pair = (await c.query(`insert into public.compatibility_pairs (user_a, user_b) values ($1,$2) returning id`, [a, b])).rows[0].id;
    await c.query(`insert into public.compatibility_results (pair_id, algorithm_version) values ($1,'compat.v1')`, [pair]);

    const swept = (await c.query(`select public.sweep_stale_anon(30) as n`)).rows[0].n;
    assert.equal(swept, 0, 'a pair member is never purged, however stale');
    assert.equal(await n(c, `select count(*)::int n from auth.users where id=$1`, [staleInvitee]), 1, 'invitee retained');
    assert.equal(await n(c, `select count(*)::int n from public.compatibility_pairs where id=$1`, [pair]), 1, "the inviter's pair survives");
    assert.equal(await n(c, `select count(*)::int n from public.compatibility_results where pair_id=$1`, [pair]), 1, "the inviter's result survives");
  });
});

test('H7: deletion_log records a REQUEST, and completion is stamped only when it is true', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    await populate(c, U);

    // account_storage_paths collects WITHOUT destroying — the caller can now delete the blobs first.
    const paths = (await c.query(`select bucket, path from public.account_storage_paths($1) order by bucket`, [U])).rows;
    assert.deepEqual(paths.map((r) => `${r.bucket}:${r.path}`), [`cards:${U}/card.png`, `scans:${U}/s.jpg`]);
    assert.equal(await n(c, `select count(*)::int n from public.scans where user_id=$1`, [U]), 1, 'collect must not delete anything');

    await c.query(`select * from public.purge_account($1)`, [U]);
    const log = (await c.query(`select requested_at, completed_at from public.deletion_log where user_id=$1 and scope='account'`, [U])).rows[0];
    assert.ok(log.requested_at, 'requested_at stamped');
    assert.equal(log.completed_at, null, 'completed_at must NOT be claimed before the storage work runs');

    await c.query(`select public.mark_deletion_complete($1,'account')`, [U]);
    const done = (await c.query(`select completed_at from public.deletion_log where user_id=$1 and scope='account'`, [U])).rows[0];
    assert.ok(done.completed_at, 'completed_at stamped once the caller confirms the blobs are gone');
  });
});

test('lifecycle RPCs are service-role only (no client access)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    for (const fn of ['purge_account(uuid)', 'request_image_deletion(uuid)', 'crops_due_for_deletion(int)', 'sweep_stale_anon(int)', 'sweep_expired_invites()']) {
      const anon = (await c.query(`select has_function_privilege('authenticated', 'public.${fn}', 'execute') as can`)).rows[0].can;
      assert.equal(anon, false, `authenticated cannot execute ${fn}`);
      const svc = (await c.query(`select has_function_privilege('service_role', 'public.${fn}', 'execute') as can`)).rows[0].can;
      assert.equal(svc, true, `service_role can execute ${fn}`);
    }
  });
});
