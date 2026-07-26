/**
 * RF0.T3 (Audit-5 · 03 §2.4) — `profiles.paywall_declined_at`, the server-side win-back trigger.
 *
 * Transactional / rolled back, like every file here. What has to hold: the column exists and is
 * NULLable (additive, no backfill), an owner can write their OWN decline through the existing
 * `profiles_update_own` policy, and a stranger's decline is invisible/untouchable — the column is
 * on the same row as the birth date, so a leaky policy here would be a leaky policy there.
 *
 * Requires migration `20260726000035_rf0t3_paywall_declined_at` to be applied (`supabase db push`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, asRole, resetRole, seedUser } from './lib/db.mjs';

const A = 'aaaaaaaa-0000-4000-8000-00000000ee01';
const B = 'bbbbbbbb-0000-4000-8000-00000000ee02';
const TS = '2026-07-26T09:15:00Z';

async function setup(c) {
  await applyMigrations(c);
  // seedUser inserts auth.users; the on_auth_user_created trigger creates the public.profiles row.
  for (const u of [A, B]) await seedUser(c, u);
}

test('paywall_declined_at exists, is nullable, and defaults to NULL (additive column)', async () => {
  await withRollback(async (c) => {
    await setup(c);
    const col = (
      await c.query(
        `select data_type, is_nullable, column_default
           from information_schema.columns
          where table_schema='public' and table_name='profiles' and column_name='paywall_declined_at'`,
      )
    ).rows[0];
    assert.ok(col, 'profiles.paywall_declined_at is missing — run supabase db push');
    assert.equal(col.data_type, 'timestamp with time zone');
    assert.equal(col.is_nullable, 'YES', 'must be nullable — expand-contract, no backfill');
    assert.equal(col.column_default, null, 'no default: a fresh profile has NOT declined anything');

    const fresh = (await c.query(`select paywall_declined_at from public.profiles where id=$1`, [A])).rows[0];
    assert.equal(fresh.paywall_declined_at, null);
  });
});

test('an owner can record their own decline (profiles_update_own)', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await asRole(c, { uid: A });
    await c.query(`update public.profiles set paywall_declined_at=$1 where id=$2`, [TS, A]);
    const row = (await c.query(`select paywall_declined_at from public.profiles where id=$1`, [A])).rows[0];
    assert.ok(row.paywall_declined_at, 'owner write landed');
    assert.equal(new Date(row.paywall_declined_at).toISOString(), new Date(TS).toISOString());
    await resetRole(c);
  });
});

test("a user cannot write — or even see — another user's decline", async () => {
  await withRollback(async (c) => {
    await setup(c);
    await c.query(`update public.profiles set paywall_declined_at=$1 where id=$2`, [TS, B]); // superuser seed

    await asRole(c, { uid: A });
    // RLS filters the row out entirely, so the update matches nothing rather than raising.
    const upd = await c.query(`update public.profiles set paywall_declined_at=now() where id=$1`, [B]);
    assert.equal(upd.rowCount, 0, "A must not be able to touch B's profile");
    const seen = await c.query(`select 1 from public.profiles where id=$1`, [B]);
    assert.equal(seen.rowCount, 0, "B's profile is invisible to A");
    await resetRole(c);

    // B's real value survived A's attempt untouched.
    const row = (await c.query(`select paywall_declined_at from public.profiles where id=$1`, [B])).rows[0];
    assert.equal(new Date(row.paywall_declined_at).toISOString(), new Date(TS).toISOString());
  });
});

test('the win-back selector finds a >24h decline and skips a fresh one', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await c.query(`update public.profiles set paywall_declined_at = now() - interval '30 hours' where id=$1`, [A]);
    await c.query(`update public.profiles set paywall_declined_at = now() - interval '2 hours' where id=$1`, [B]);
    // The exact predicate the RF4.T4 fan-out leg runs.
    const due = (
      await c.query(
        `select id from public.profiles
          where paywall_declined_at is not null and paywall_declined_at < now() - interval '24 hours'
          order by id`,
      )
    ).rows.map((r) => r.id);
    assert.ok(due.includes(A), 'a 30h-old decline is due');
    assert.ok(!due.includes(B), 'a 2h-old decline is not');
  });
});
