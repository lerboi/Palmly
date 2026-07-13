/**
 * P8.T2 (invite-create contract) — the `invites` DB behavior the edge function relies on, exercised
 * as the RLS-scoped authenticated user (Backend §8, §13). Transactional / rolled back. The token
 * generation + hashing are unit-tested in Deno (_shared/invite.test.ts); this proves: a minted
 * invite is `created`/unassigned with a 30-day expiry + hash at rest, the owner reads it and a
 * stranger cannot, and the tightened INSERT policy (P3.T2) blocks forging an invite into a victim.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser, asRole } from './lib/db.mjs';

const A = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const B = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];
const n = async (c, sql, p = []) => (await c.query(sql, p)).rows[0].n;

test('invite-create mints a created, unassigned invite with a 30-day expiry + hash at rest', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    await asRole(c, { uid: A, role: 'authenticated' });

    const inv = await one(
      c,
      `insert into public.invites (inviter_id, token_hash, kind, context)
       values ($1, 'hash_abc', 'compatibility', '{"reading_id":"r1","card_variant":"feed_4x5"}')
       returning id, status, invitee_id, token_hash, expires_at,
                 (expires_at > now() + interval '29 days' and expires_at < now() + interval '31 days') as exp_30d`,
      [A],
    );
    assert.equal(inv.status, 'created', 'starts in created');
    assert.equal(inv.invitee_id, null, 'no invitee yet');
    assert.equal(inv.token_hash, 'hash_abc', 'only the hash is stored');
    assert.equal(inv.exp_30d, true, 'expires ~30 days out');
  });
});

test('invites are readable by the inviter, invisible to a stranger', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    await seedUser(c, B);
    await asRole(c, { uid: A, role: 'authenticated' });
    await one(c, `insert into public.invites (inviter_id, token_hash, context) values ($1,'h_read','{}') returning id`, [A]);
    assert.equal(await n(c, `select count(*)::int n from public.invites`), 1, 'inviter reads own invite');

    await asRole(c, { uid: B, role: 'authenticated' });
    assert.equal(await n(c, `select count(*)::int n from public.invites`), 0, 'stranger sees no unaccepted invite');
  });
});

test('a client cannot forge an invite into a victim (invitee_id set / status pre-accepted rejected)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    await seedUser(c, B);
    await asRole(c, { uid: A, role: 'authenticated' });

    const expectDenied = async (sql, params) => {
      await c.query('savepoint sp');
      await assert.rejects(c.query(sql, params), (e) => e.code === '42501', 'RLS denies');
      await c.query('rollback to savepoint sp');
    };
    // forging a victim as the invitee, or a pre-accepted status, violates the tightened with-check
    await expectDenied(`insert into public.invites (inviter_id, token_hash, invitee_id) values ($1,'h1',$2)`, [A, B]);
    await expectDenied(`insert into public.invites (inviter_id, token_hash, status) values ($1,'h2','accepted')`, [A]);
    // and you cannot mint an invite as somebody else
    await expectDenied(`insert into public.invites (inviter_id, token_hash) values ($1,'h3')`, [B]);
  });
});

test('token_hash is unique — a hash collision cannot create a second invite', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    await asRole(c, { uid: A, role: 'authenticated' });
    await one(c, `insert into public.invites (inviter_id, token_hash) values ($1,'dup_hash') returning id`, [A]);
    await c.query('savepoint sp');
    await assert.rejects(
      c.query(`insert into public.invites (inviter_id, token_hash) values ($1,'dup_hash')`, [A]),
      (e) => e.code === '23505',
      'unique violation on token_hash',
    );
    await c.query('rollback to savepoint sp');
  });
});
