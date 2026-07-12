/**
 * P3.T6 (backend half) — anonymous-first profile provisioning (Backend §3.6, §5.1):
 * every new auth.users row auto-gets a public.profiles row via the on_auth_user_created
 * trigger, with is_anonymous mirrored. Transactional/rolled-back.
 * (The client signInAnonymously() + session-reuse leg is verified separately, and the
 * Turnstile CAPTCHA leg is gated on the H5 site key.)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser } from './lib/db.mjs';

test('a new auth user auto-provisions a profile row, mirroring is_anonymous', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    const anon = 'aaaaaaaa-0000-0000-0000-000000000001';
    const perm = 'bbbbbbbb-0000-0000-0000-000000000002';

    await seedUser(c, anon, { isAnonymous: true });
    await seedUser(c, perm, { isAnonymous: false });

    const rows = (
      await c.query(`select id, is_anonymous from public.profiles where id in ($1,$2)`, [anon, perm])
    ).rows;
    assert.equal(rows.length, 2, 'both auth users got a profile row');

    const flag = Object.fromEntries(rows.map((r) => [r.id, r.is_anonymous]));
    assert.equal(flag[anon], true, 'anonymous user profile is_anonymous=true');
    assert.equal(flag[perm], false, 'permanent user profile is_anonymous=false');
  });
});
