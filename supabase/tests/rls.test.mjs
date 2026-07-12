/**
 * P3.T2 — RLS proofs (Backend spec §3.2 verify). THE deliverable, per the build plan:
 * "The RLS tests are the deliverable, not just the policies." Runs against staging inside a
 * rolled-back transaction; seeds as the superuser (RLS-bypassing) then impersonates the
 * `authenticated` role (+ JWT claims) to assert each policy.
 *
 * Coverage hardened after the P3 adversarial review (2026-07-12): every owner-only, pair,
 * service-role-only, and client-writable policy has positive + negative assertions, plus the
 * privilege-escalation guards (self-grant premium, forge others' rows). `expectDenied` checks
 * SQLSTATE 42501 so a masked FK/NOT-NULL/PK error can't produce a false "denied".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, asRole, resetRole, seedUser } from './lib/db.mjs';

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
const C = '33333333-3333-3333-3333-333333333333';
const D = '44444444-4444-4444-4444-444444444444'; // auth.users only, NO profile (for insert-with-check tests)

async function setup(c) {
  await applyMigrations(c);
  // seedUser inserts an auth.users row; the on_auth_user_created trigger (migration 0005)
  // auto-creates the matching public.profiles row (is_anonymous=false here).
  for (const u of [A, B, C]) await seedUser(c, u);
}

/** Seed a full owner FK chain (scan → feature_set → subject_profile → reading → share_card). */
async function seedReadingChain(c, uid) {
  const scan = (
    await c.query(
      `insert into public.scans (user_id, kind, side, status) values ($1,'palm','left','complete') returning id`,
      [uid],
    )
  ).rows[0].id;
  const fs = (
    await c.query(
      `insert into public.feature_sets
         (scan_id, user_id, kind, side, features, feature_schema_version, extractor_version, geometry, feature_hash)
       values ($1,$2,'palm','left','{}',1,'v1','{}','hash') returning id`,
      [scan, uid],
    )
  ).rows[0].id;
  await c.query(
    `insert into public.subject_profiles (user_id, kind, canonical_feature_set_id) values ($1,'palm_left',$2)`,
    [uid, fs],
  );
  const reading = (
    await c.query(
      `insert into public.readings (user_id, feature_set_id, kind, narrative, model_id, prompt_version, kb_version)
       values ($1,$2,'palm','{}','m','p','k') returning id`,
      [uid, fs],
    )
  ).rows[0].id;
  await c.query(
    `insert into public.share_cards (user_id, source_type, source_id, variant, locale, storage_path)
     values ($1,'reading',$2,'feed_4x5','en','cards/x.png')`,
    [uid, reading],
  );
  return { scan, fs, reading };
}

/** Assert an operation is denied specifically by RLS/permission (SQLSTATE 42501), tx-safe. */
async function expectDenied(c, sql, params, label) {
  await c.query('savepoint sp');
  let err = null;
  try {
    await c.query(sql, params);
  } catch (e) {
    err = e;
    await c.query('rollback to savepoint sp');
  }
  if (!err) await c.query('release savepoint sp');
  assert.ok(err, `${label} — should be denied`);
  assert.equal(
    err.code,
    '42501',
    `${label} — must be an RLS/permission denial, got SQLSTATE ${err.code}: ${err.message.split('\n')[0]}`,
  );
}

const countOf = async (c, table) =>
  (await c.query(`select count(*)::int n from public.${table}`)).rows[0].n;
const affected = async (c, sql, params) => (await c.query(sql, params)).rowCount;

test('owner reads own scan; stranger cannot', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await c.query(
      `insert into public.scans (user_id, kind, side, status) values ($1,'palm','left','complete')`,
      [A],
    );
    await asRole(c, { uid: A });
    assert.equal(await countOf(c, 'scans'), 1, 'owner A sees own scan');
    await resetRole(c);
    await asRole(c, { uid: B });
    assert.equal(await countOf(c, 'scans'), 0, 'stranger B sees nothing');
    await resetRole(c);
  });
});

test('owner-only READ tables (feature_sets, subject_profiles, readings, share_cards): owner sees, stranger cannot', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await seedReadingChain(c, A);
    for (const t of ['feature_sets', 'subject_profiles', 'readings', 'share_cards']) {
      await asRole(c, { uid: A });
      assert.equal(await countOf(c, t), 1, `owner A sees own ${t}`);
      await resetRole(c);
      await asRole(c, { uid: B });
      assert.equal(await countOf(c, t), 0, `stranger B sees no ${t}`);
      await resetRole(c);
    }
  });
});

test('server-owned tables reject authenticated writes (forgery denied; writes come from service_role)', async () => {
  await withRollback(async (c) => {
    await setup(c);
    const { fs } = await seedReadingChain(c, A);
    const [ua, ub] = A < B ? [A, B] : [B, A];
    const pair = (
      await c.query(
        `insert into public.compatibility_pairs (user_a, user_b) values ($1,$2) returning id`,
        [ua, ub],
      )
    ).rows[0].id;

    await asRole(c, { uid: A });
    await expectDenied(c, `insert into public.scans (user_id, kind) values ($1,'palm')`, [A], 'forge scan');
    await expectDenied(
      c,
      `insert into public.feature_sets (scan_id, user_id, kind, features, feature_schema_version, extractor_version, geometry, feature_hash)
       select id,$1,'palm','{}',1,'v','{}','h' from public.scans limit 1`,
      [A],
      'forge feature_set',
    );
    await expectDenied(
      c,
      `insert into public.readings (user_id, feature_set_id, kind, narrative, model_id, prompt_version, kb_version)
       values ($1,$2,'palm','{"faked":"premium"}','m','p','k')`,
      [A, fs],
      'forge reading',
    );
    await expectDenied(
      c,
      `insert into public.compatibility_pairs (user_a, user_b) values ($1,$2)`,
      [A, C], // A < C so the canonical CHECK passes and RLS is the only barrier
      'forge compatibility_pair with a stranger',
    );
    await expectDenied(
      c,
      `insert into public.compatibility_results (pair_id, status, algorithm_version) values ($1,'complete','v1')`,
      [pair],
      'forge compatibility_result',
    );
    await resetRole(c);
  });
});

test('either pair member reads the pair + result; third party cannot', async () => {
  await withRollback(async (c) => {
    await setup(c);
    const [ua, ub] = A < B ? [A, B] : [B, A];
    const pair = (
      await c.query(
        `insert into public.compatibility_pairs (user_a, user_b) values ($1,$2) returning id`,
        [ua, ub],
      )
    ).rows[0].id;
    await c.query(
      `insert into public.compatibility_results (pair_id, status, algorithm_version) values ($1,'complete','v1')`,
      [pair],
    );
    for (const [who, uid, expected] of [
      ['A', A, 1],
      ['B', B, 1],
      ['C', C, 0],
    ]) {
      await asRole(c, { uid });
      assert.equal(await countOf(c, 'compatibility_pairs'), expected, `${who}: pair visibility`);
      assert.equal(await countOf(c, 'compatibility_results'), expected, `${who}: result visibility`);
      await resetRole(c);
    }
  });
});

test('subscriptions: owner reads own; stranger cannot; user cannot self-grant premium', async () => {
  await withRollback(async (c) => {
    await setup(c);
    // seed A's entitlement as the superuser (mimics the service-role RevenueCat webhook)
    await c.query(
      `insert into public.subscriptions (user_id, rc_app_user_id, entitlements, status)
       values ($1,'rc-a','{"premium":{"expires_at":"2027-01-01"}}','active')`,
      [A],
    );

    await asRole(c, { uid: A });
    assert.equal(await countOf(c, 'subscriptions'), 1, 'A reads own entitlements');
    // no UPDATE policy → USING filters to 0 rows (silent), so a self-grant changes nothing
    assert.equal(
      await affected(c, `update public.subscriptions set entitlements='{"premium":{}}' where user_id=$1`, [A]),
      0,
      'A cannot self-grant premium via UPDATE',
    );
    await resetRole(c);

    await asRole(c, { uid: B });
    assert.equal(await countOf(c, 'subscriptions'), 0, 'B cannot read A entitlements');
    await resetRole(c);

    // C has a profile but no subscription row → INSERT self-grant must be denied (no insert policy)
    await asRole(c, { uid: C });
    await expectDenied(
      c,
      `insert into public.subscriptions (user_id, rc_app_user_id, entitlements) values ($1,'x','{"premium":{}}')`,
      [C],
      'self-grant premium via INSERT',
    );
    await resetRole(c);
  });
});

test('invites SELECT: inviter and invitee both see the row; a third party cannot', async () => {
  await withRollback(async (c) => {
    await setup(c);
    // accepted invite A→B seeded as superuser
    await c.query(
      `insert into public.invites (inviter_id, invitee_id, token_hash, status) values ($1,$2,'h-sel','accepted')`,
      [A, B],
    );
    for (const [who, uid, expected] of [
      ['inviter A', A, 1],
      ['invitee B', B, 1],
      ['third party C', C, 0],
    ]) {
      await asRole(c, { uid });
      assert.equal(await countOf(c, 'invites'), expected, `${who} invite visibility`);
      await resetRole(c);
    }
  });
});

test('anon-JWT restrictive policy + invite forgery: only a permanent user can create a fresh own invite', async () => {
  await withRollback(async (c) => {
    await setup(c);
    const ins = `insert into public.invites (inviter_id, token_hash) values ($1,$2)`;

    await asRole(c, { uid: A, isAnonymous: false });
    await c.query(ins, [A, 'hash-a']);
    assert.equal(await countOf(c, 'invites'), 1, 'permanent user can send an invite');
    // forge invitee_id into a victim's read surface → denied by the tightened WITH CHECK
    await expectDenied(
      c,
      `insert into public.invites (inviter_id, invitee_id, token_hash) values ($1,$2,'h-forge')`,
      [A, B],
      'forge invitee_id',
    );
    // preset accepted status → denied
    await expectDenied(
      c,
      `insert into public.invites (inviter_id, token_hash, status) values ($1,'h-st','accepted')`,
      [A],
      'preset invite status',
    );
    await resetRole(c);

    // anonymous user cannot send an invite at all (restrictive is_anonymous policy)
    await asRole(c, { uid: B, isAnonymous: true });
    await expectDenied(c, ins, [B, 'hash-b'], 'anonymous invite');
    await resetRole(c);

    // permanent user cannot send on behalf of another (permissive WITH CHECK)
    await asRole(c, { uid: A, isAnonymous: false });
    await expectDenied(c, ins, [C, 'hash-c'], 'invite on behalf of another user');
    await resetRole(c);
  });
});

test('profiles: owner-only read + self-write; no cross-user read/update/insert', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await seedUser(c, D); // trigger auto-creates D's profile...
    await c.query('delete from public.profiles where id=$1', [D]); // ...remove it so the INSERT WITH CHECK is the only barrier

    await asRole(c, { uid: A });
    assert.equal(await countOf(c, 'profiles'), 1, 'A sees only own profile');
    assert.equal(
      await affected(c, `update public.profiles set display_name='mine' where id=$1`, [A]),
      1,
      'A can self-edit own profile',
    );
    // insert a profile for a different (real auth) user D → WITH CHECK denies (FK is satisfied)
    await expectDenied(c, `insert into public.profiles (id) values ($1)`, [D], 'insert profile for another user');
    await resetRole(c);

    await asRole(c, { uid: B });
    assert.equal(
      await affected(c, `update public.profiles set display_name='hax' where id=$1`, [A]),
      0,
      'B cannot update A\'s profile (0 rows)',
    );
    await resetRole(c);
  });
});

test('shared reference tables (fortune_templates, kb_chunks) readable by any authenticated user', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await c.query(
      `insert into public.fortune_templates (fortune_date, pillar_bucket, locale, content)
       values (current_date,'wood_wood','en','{}')`,
    );
    await c.query(
      `insert into public.kb_chunks (kb_version, tradition, feature_key, content)
       values ('v1','palmistry','heart_line.deep_long','...')`,
    );
    await asRole(c, { uid: A });
    assert.equal(await countOf(c, 'fortune_templates'), 1, 'fortune_templates readable');
    assert.equal(await countOf(c, 'kb_chunks'), 1, 'kb_chunks readable');
    await resetRole(c);
  });
});

test('user_fortunes: owner inserts/reads own; cannot insert for another or read another', async () => {
  await withRollback(async (c) => {
    await setup(c);
    const ins = `insert into public.user_fortunes (user_id, fortune_date, pillar_bucket) values ($1, current_date, 'wood_wood')`;

    await asRole(c, { uid: A });
    await c.query(ins, [A]);
    assert.equal(await countOf(c, 'user_fortunes'), 1, 'A inserts + reads own read-receipt');
    await expectDenied(c, ins, [B], 'insert user_fortune for another user');
    await resetRole(c);

    await asRole(c, { uid: B });
    assert.equal(await countOf(c, 'user_fortunes'), 0, 'B cannot read A read-receipt');
    await resetRole(c);
  });
});

test('devices: owner CRUD works; strangers cannot read or delete another user\'s device (push-token isolation)', async () => {
  await withRollback(async (c) => {
    await setup(c);
    // B's device seeded as superuser
    await c.query(
      `insert into public.devices (user_id, expo_push_token, platform) values ($1,'ExpoTok-B','android')`,
      [B],
    );

    await asRole(c, { uid: A });
    await c.query(
      `insert into public.devices (user_id, expo_push_token, platform) values ($1,'ExpoTok-A','ios')`,
      [A],
    );
    assert.equal(await countOf(c, 'devices'), 1, "A sees only its own device (not B's)");
    // cross-user DELETE → USING filters to 0 rows (no throw)
    assert.equal(
      await affected(c, `delete from public.devices where user_id=$1`, [B]),
      0,
      "A cannot delete B's device",
    );
    // cross-user INSERT → WITH CHECK denies
    await expectDenied(
      c,
      `insert into public.devices (user_id, expo_push_token) values ($1,'ExpoTok-hijack')`,
      [B],
      "register a device under another user's id",
    );
    await resetRole(c);
  });
});

test('service-role-only audit tables deny both read and write to authenticated', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await c.query(
      `insert into public.subscription_events (rc_event_id, user_id, type, payload) values ('evt1',$1,'INITIAL_PURCHASE','{}')`,
      [A],
    );
    await c.query(`insert into public.deletion_log (user_id, scope) values ($1,'account')`, [A]);

    await asRole(c, { uid: A });
    assert.equal(await countOf(c, 'subscription_events'), 0, 'subscription_events deny-all read');
    assert.equal(await countOf(c, 'deletion_log'), 0, 'deletion_log deny-all read');
    await expectDenied(
      c,
      `insert into public.subscription_events (rc_event_id, type, payload) values ('evtX','x','{}')`,
      [],
      'write subscription_events',
    );
    await expectDenied(c, `insert into public.deletion_log (user_id, scope) values ($1,'x')`, [A], 'write deletion_log');
    await resetRole(c);
  });
});

test('chat_messages ownership flows through the thread (security-definer helper)', async () => {
  await withRollback(async (c) => {
    await setup(c);
    const thread = (
      await c.query(`insert into public.chat_threads (user_id) values ($1) returning id`, [A])
    ).rows[0].id;
    await c.query(
      `insert into public.chat_messages (thread_id, role, content) values ($1,'user','hi')`,
      [thread],
    );
    await asRole(c, { uid: A });
    assert.equal(await countOf(c, 'chat_messages'), 1, "A sees own thread's messages");
    await resetRole(c);
    await asRole(c, { uid: B });
    assert.equal(await countOf(c, 'chat_messages'), 0, "B cannot see A's messages");
    await resetRole(c);
  });
});
