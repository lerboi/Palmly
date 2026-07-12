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
