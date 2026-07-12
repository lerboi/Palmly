/**
 * P3.T1 smoke test — proves the Docker-free harness can reach staging, run a
 * transaction, apply whatever migrations exist, and roll everything back cleanly.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, loadMigrations, asRole, resetRole } from './lib/db.mjs';

test('connects to staging and can BEGIN/ROLLBACK', async () => {
  await withRollback(async (c) => {
    const r = await c.query('select 1 as ok');
    assert.equal(r.rows[0].ok, 1);
  });
});

test('all migrations apply cleanly inside a rolled-back transaction', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
  });
  assert.ok(loadMigrations().length >= 0);
});

test('role impersonation resolves auth.uid() then resets', async () => {
  await withRollback(async (c) => {
    const uid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    await asRole(c, { uid, role: 'authenticated' });
    const got = (await c.query('select auth.uid() as uid')).rows[0].uid;
    assert.equal(got, uid);
    await resetRole(c);
  });
});
