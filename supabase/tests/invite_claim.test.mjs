/**
 * P8.T4 — invite claim (Backend §8.2). Transactional / rolled back. Proves `claim_invite` accepts
 * an invite once, links the invitee, creates the canonical compatibility pair, and is idempotent +
 * single-use, with self/expired/revoked rejected. (The deferred-deep-link matching that produces
 * the token — clipboard / Play referrer / AppsFlyer — is on-device; this is the backend core.)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser } from './lib/db.mjs';

const INVITER = 'f1111111-1111-1111-1111-111111111111';
const INVITEE = 'f2222222-2222-2222-2222-222222222222';
const OTHER = 'f3333333-3333-3333-3333-333333333333';
const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];
const n = async (c, sql, p = []) => (await c.query(sql, p)).rows[0].n;
const claim = (c, hash, invitee) => one(c, `select public.claim_invite($1,$2) as r`, [hash, invitee]);

const seedInvite = (c, hash, { status = 'created', expires = "now() + interval '30 days'" } = {}) =>
  one(c, `insert into public.invites (inviter_id, token_hash, status, expires_at) values ($1,$2,$3,${expires}) returning id`, [INVITER, hash, status]);

test('claim_invite: accepts, links the invitee, and creates the canonical pair', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, INVITER);
    await seedUser(c, INVITEE);
    await seedInvite(c, 'h_ok');

    const r = (await claim(c, 'h_ok', INVITEE)).r;
    assert.ok(r.pair_id, 'a pair was created');
    assert.equal(r.inviter_id, INVITER);

    const inv = await one(c, `select status, invitee_id, accepted_at from public.invites where token_hash='h_ok'`);
    assert.equal(inv.status, 'accepted');
    assert.equal(inv.invitee_id, INVITEE);
    assert.ok(inv.accepted_at);

    // canonical ordering user_a < user_b
    const [a, b] = [INVITER, INVITEE].sort();
    assert.equal(await n(c, `select count(*)::int n from public.compatibility_pairs where user_a=$1 and user_b=$2`, [a, b]), 1);
  });
});

test('claim_invite: a repeat claim by the same invitee is idempotent (same pair, no duplicate)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, INVITER);
    await seedUser(c, INVITEE);
    await seedInvite(c, 'h_idem');
    const first = (await claim(c, 'h_idem', INVITEE)).r;
    const second = (await claim(c, 'h_idem', INVITEE)).r;
    assert.equal(second.pair_id, first.pair_id, 'same pair returned');
    assert.equal(await n(c, `select count(*)::int n from public.compatibility_pairs`), 1, 'no duplicate pair');
  });
});

test('claim_invite: single-use — a different claimer is rejected once accepted', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, INVITER);
    await seedUser(c, INVITEE);
    await seedUser(c, OTHER);
    await seedInvite(c, 'h_single');
    await claim(c, 'h_single', INVITEE); // accepted by INVITEE
    await c.query('savepoint sp');
    await assert.rejects(claim(c, 'h_single', OTHER), /invite_already_claimed/);
    await c.query('rollback to savepoint sp');
  });
});

test('claim_invite: self-claim, expired, revoked, and unknown tokens are rejected', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, INVITER);
    await seedUser(c, INVITEE);

    const expectReject = async (hash, invitee, re) => {
      await c.query('savepoint sp');
      await assert.rejects(claim(c, hash, invitee), re);
      await c.query('rollback to savepoint sp');
    };

    await seedInvite(c, 'h_self');
    await expectReject('h_self', INVITER, /cannot_claim_own_invite/);

    await seedInvite(c, 'h_exp', { expires: "now() - interval '1 day'" });
    await expectReject('h_exp', INVITEE, /invite_expired/);

    await seedInvite(c, 'h_rev', { status: 'revoked' });
    await expectReject('h_rev', INVITEE, /invite_revoked/);

    await expectReject('h_missing', INVITEE, /invite_not_found/);
  });
});
