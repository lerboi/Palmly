/**
 * P3.T2 — schema fidelity (Backend spec §3.2): all 18 tables present, RLS enabled on each,
 * and the canonical-pair constraint (user_a < user_b) actually enforced. Transactional/rolled-back.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser } from './lib/db.mjs';

const TABLES = [
  'profiles', 'scans', 'feature_sets', 'subject_profiles', 'readings',
  'compatibility_pairs', 'compatibility_results', 'invites', 'subscriptions',
  'subscription_events', 'fortune_templates', 'user_fortunes', 'chat_threads',
  'chat_messages', 'share_cards', 'devices', 'kb_chunks', 'deletion_log',
  'worker_telemetry', // added by migration 0004 (queues/telemetry)
  'notification_log', // added by migration 0014 (P9.T5 push caps/dedupe)
  'rate_limits', // added by migration 0026 (B13/H9 — spec §13 rate limiting; Edge fns are stateless)
];

test('all public tables exist with RLS enabled — and nothing extra', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    const rows = (
      await c.query(
        `select relname, relrowsecurity from pg_class
         where relnamespace = 'public'::regnamespace and relkind = 'r'`,
      )
    ).rows;
    const rls = Object.fromEntries(rows.map((r) => [r.relname, r.relrowsecurity]));
    for (const t of TABLES) {
      assert.ok(t in rls, `table public.${t} exists`);
      assert.equal(rls[t], true, `RLS enabled on ${t}`);
    }
    assert.equal(rows.length, TABLES.length, 'exactly the expected public tables, no more');
  });
});

test('kb_chunks.embedding is pgvector(1024)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    const r = (
      await c.query(
        `select format_type(a.atttypid, a.atttypmod) as t
         from pg_attribute a
         where a.attrelid = 'public.kb_chunks'::regclass and a.attname = 'embedding'`,
      )
    ).rows[0].t;
    assert.match(r, /vector\(1024\)/, 'embedding is vector(1024)');
  });
});

test('drain_stub is NOT executable by anon/authenticated (C1)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    // drain_stub is SECURITY DEFINER in the Data-API-exposed `public` schema and returns int, so a
    // PUBLIC/anon EXECUTE grant means any holder of the publishable key can archive messages off any
    // pgmq queue via POST /rest/v1/rpc/drain_stub. Migration 0004 never revoked the default grant.
    for (const role of ['anon', 'authenticated', 'public']) {
      assert.equal(
        (await c.query(`select has_function_privilege($1, 'public.drain_stub(text,int)', 'execute') as x`, [role])).rows[0].x,
        false,
        `${role} must NOT execute drain_stub`,
      );
    }
    // ...but the cron scheduler (owner) and service_role must keep it, or the drains break.
    for (const role of ['postgres', 'service_role']) {
      assert.equal(
        (await c.query(`select has_function_privilege($1, 'public.drain_stub(text,int)', 'execute') as x`, [role])).rows[0].x,
        true,
        `${role} must retain execute`,
      );
    }
  });
});

test('RLS policy columns are indexed (M13)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    // Backend §3.3: "always index policy columns" — an unindexed policy column is a seq scan on
    // every RLS check.
    const REQUIRED = [
      ['compatibility_results', 'pair_id'],
      ['chat_threads', 'user_id'],
      ['share_cards', 'user_id'],
      ['devices', 'user_id'],
      ['invites', 'invitee_id'],
    ];
    for (const [table, col] of REQUIRED) {
      const { n } = (
        await c.query(
          `select count(*)::int n from pg_index i
             join pg_class t on t.oid = i.indrelid
             join pg_attribute a on a.attrelid = t.oid and a.attnum = i.indkey[0]
           where t.relname = $1 and a.attname = $2`,
          [table, col],
        )
      ).rows[0];
      assert.ok(n >= 1, `${table}.${col} must lead an index`);
    }
  });
});

test('canonical-pair check (user_a < user_b) is enforced', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    const A = '11111111-1111-1111-1111-111111111111';
    const B = '22222222-2222-2222-2222-222222222222';
    await seedUser(c, A); // trigger auto-creates each profile (migration 0005)
    await seedUser(c, B);
    // A < B is fine
    await c.query(`insert into public.compatibility_pairs (user_a, user_b) values ($1,$2)`, [A, B]);
    // reversed violates the check
    await assert.rejects(
      () => c.query(`insert into public.compatibility_pairs (user_a, user_b) values ($1,$2)`, [B, A]),
      /check constraint/i,
      'user_a > user_b must be rejected',
    );
  });
});

test('Low (B20): profiles.updated_at is maintained by moddatetime — the DB owns it, not the client', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    const U = '33333333-3333-3333-3333-333333333333';
    await seedUser(c, U); // trigger auto-creates the profile (migration 0005)

    // Before migration 0030 `profiles` had ZERO triggers and nothing in supabase/functions or
    // app/src ever wrote this column, so it stayed equal to created_at forever — a timestamp that
    // always lied. The trigger is what makes 0001's `not null default now()` mean something.
    const def = (await c.query(
      `select pg_get_triggerdef(oid) def from pg_trigger
        where tgrelid='public.profiles'::regclass and tgname='profiles_set_updated_at' and not tgisinternal`,
    )).rows;
    assert.equal(def.length, 1, 'the trigger exists');
    assert.match(def[0].def, /BEFORE UPDATE/i, 'BEFORE, so it overrides rather than races the write');
    assert.match(def[0].def, /moddatetime\('updated_at'\)/i, 'and stamps the updated_at column specifically');

    // ⚠️ What this test deliberately does NOT assert: that updated_at ADVANCES between two writes.
    // moddatetime stamps now() — the TRANSACTION START timestamp — and this whole harness is one
    // rolled-back transaction, so now() is frozen for its entire duration (verified: with a 50ms
    // pg_sleep, updated_at stayed at now()=…40.415 while clock_timestamp() reached …41.035). The
    // advance is real in production, where every UPDATE is its own transaction; it is simply not
    // observable here, and an assertion that it advances fails against CORRECT code.
    //
    // What IS observable, and is the property that matters: the database overrides whatever the
    // client sends, so updated_at cannot be back-dated or pinned.
    const { now_ts } = (await c.query(`select now() as now_ts`)).rows[0];
    await c.query(`update public.profiles set display_name='Renamed', updated_at='2000-01-01T00:00:00Z' where id=$1`, [U]);
    const after = (await c.query(`select created_at, updated_at from public.profiles where id=$1`, [U])).rows[0];

    assert.deepEqual(after.updated_at, now_ts, 'the trigger stamped now(), not the value the client supplied');
    assert.ok(after.updated_at.getUTCFullYear() > 2000, 'a client-supplied updated_at is discarded');
    assert.deepEqual(after.created_at, (await c.query(`select created_at from public.profiles where id=$1`, [U])).rows[0].created_at, 'created_at is untouched');
  });
});
