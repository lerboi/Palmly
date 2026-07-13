/**
 * P7.T3 (persistence half) — RevenueCat webhook `record_rc_event` (Backend §5.2). Transactional /
 * rolled back. The HMAC signature verify + entitlement derivation are unit-tested in Deno
 * (_shared/revenuecat.test.ts); this proves the atomic DB effect: idempotent event append +
 * authoritative `subscriptions` upsert, the server-side gate's source of truth.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser } from './lib/db.mjs';

const U = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];
const n = async (c, sql, p = []) => (await c.query(sql, p)).rows[0].n;

const record = (c, { id, userId = U, type = 'INITIAL_PURCHASE', status = 'active', ent = { premium: { expires_at: '2099-01-01T00:00:00Z', product_id: 'palmly_monthly', store: 'APP_STORE' } } }) =>
  one(c, `select public.record_rc_event($1,$2,$3,$4,$5,$6,$7) as applied`,
    [id, userId, type, JSON.stringify({ id, type }), userId, status, JSON.stringify(ent)]);

test('record_rc_event: a new event upserts the subscription and returns applied=true', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    const r = await record(c, { id: 'evt_purchase' });
    assert.equal(r.applied, true);
    const sub = await one(c, `select status, entitlements, rc_app_user_id from public.subscriptions where user_id=$1`, [U]);
    assert.equal(sub.status, 'active');
    assert.equal(sub.entitlements.premium.product_id, 'palmly_monthly');
    assert.equal(sub.rc_app_user_id, U);
    assert.equal(await n(c, `select count(*)::int n from public.subscription_events where rc_event_id='evt_purchase'`), 1);
  });
});

test('record_rc_event: a duplicate rc_event_id is an idempotent no-op (applied=false, no second row)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    assert.equal((await record(c, { id: 'evt_dup' })).applied, true);
    // replay the SAME event id but with a different derived status — must NOT overwrite
    assert.equal((await record(c, { id: 'evt_dup', status: 'expired', ent: {} })).applied, false);
    assert.equal(await n(c, `select count(*)::int n from public.subscription_events where rc_event_id='evt_dup'`), 1, 'event stored once');
    assert.equal((await one(c, `select status from public.subscriptions where user_id=$1`, [U])).status, 'active', 'subscription untouched by the replay');
  });
});

test('record_rc_event: a later event flips the entitlement (active → expired)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    await record(c, { id: 'evt_a', type: 'INITIAL_PURCHASE', status: 'active' });
    await record(c, { id: 'evt_b', type: 'EXPIRATION', status: 'expired', ent: {} });
    const sub = await one(c, `select status, entitlements from public.subscriptions where user_id=$1`, [U]);
    assert.equal(sub.status, 'expired');
    assert.deepEqual(sub.entitlements, {}, 'premium entitlement cleared on expiration');
    assert.equal(await n(c, `select count(*)::int n from public.subscription_events where user_id=$1`, [U]), 2, 'both events logged');
  });
});

test('record_rc_event: an event for an unknown user is logged but upserts no subscription', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    const ghost = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'; // no profile
    const r = await record(c, { id: 'evt_ghost', userId: ghost });
    assert.equal(r.applied, true, 'event still recorded for audit');
    assert.equal(await n(c, `select count(*)::int n from public.subscriptions where user_id=$1`, [ghost]), 0, 'no subscription for an unknown user');
    assert.equal(await n(c, `select count(*)::int n from public.subscription_events where rc_event_id='evt_ghost'`), 1);
  });
});
