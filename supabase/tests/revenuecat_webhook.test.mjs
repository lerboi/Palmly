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
    assert.equal(
      await n(c, `select count(*)::int n from public.subscription_events where rc_event_id='evt_ghost' and applied_at is null`),
      1,
      'logged but NOT marked applied — the idempotency key must not swallow a never-applied event',
    );
  });
});

test('record_rc_event: an event logged before its user existed still applies on redelivery (H4)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    const late = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

    // RC beats provisioning: the event is logged for audit, but there is no profile to apply it to.
    assert.equal((await record(c, { id: 'evt_late', userId: late })).applied, true, 'recorded for audit');
    assert.equal(await n(c, `select count(*)::int n from public.subscriptions where user_id=$1`, [late]), 0, 'nothing to upsert yet');

    // The user is provisioned, then RC redelivers the SAME event id. Before this fix the key was
    // already consumed, so the redelivery deduped to a no-op and the entitlement was lost forever.
    await seedUser(c, late);
    assert.equal((await record(c, { id: 'evt_late', userId: late })).applied, true, 'redelivery applies it');
    assert.equal(
      (await one(c, `select status from public.subscriptions where user_id=$1`, [late])).status,
      'active',
      'entitlement recovered rather than permanently dropped',
    );
    assert.equal(
      await n(c, `select count(*)::int n from public.subscription_events where rc_event_id='evt_late'`),
      1,
      'still exactly one audit row (idempotent log)',
    );
    assert.equal(
      await n(c, `select count(*)::int n from public.subscription_events where rc_event_id='evt_late' and applied_at is not null`),
      1,
      'now stamped applied',
    );
  });
});
// ── H4 residue (B15) ────────────────────────────────────────────────────────────────────────────

test('H4: rc_event_id is NOT NULL — a null idempotency key can never be inserted again', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    // NULLs never conflict in Postgres, so a nullable idempotency key is not one: a null-id event
    // would re-insert and re-upsert forever. B1 stopped record_rc_event writing null; this is the
    // contraction that stops ANY writer.
    await c.query('savepoint sp');
    await assert.rejects(
      c.query(`insert into public.subscription_events (rc_event_id, user_id, type, payload) values (null, $1, 'X', '{}'::jsonb)`, [U]),
      /not-null constraint|null value in column/i,
      'a null rc_event_id is rejected by the database itself',
    );
    await c.query('rollback to savepoint sp');
  });
});

test('H4: a stale event cannot overwrite newer state (ordering guard, D-05)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    // event_timestamp_ms values computed independently (Date.UTC), not by the code under test.
    const OLDER = 1767225600000; // 2026-01-01T00:00:00Z
    const NEWER = 1780272000000; // 2026-06-01T00:00:00Z
    const send = (id, type, status, ts, ent) =>
      one(c, `select public.record_rc_event($1,$2,$3,$4,$5,$6,$7) as applied`, [
        id, U, type, JSON.stringify({ id, type, event_timestamp_ms: ts }), U, status, JSON.stringify(ent),
      ]);

    // the NEWER event lands first (RC retries out of order — it retries for up to ~2.6h)
    await send('evt_expire', 'EXPIRATION', 'expired', NEWER, {});
    assert.equal((await one(c, `select status from public.subscriptions where user_id=$1`, [U])).status, 'expired');

    // ...then a DELAYED RENEWAL from BEFORE it arrives. It must NOT resurrect the subscription.
    await send('evt_renew_late', 'RENEWAL', 'active', OLDER, { premium: { expires_at: '2099-01-01T00:00:00Z' } });
    const after = await one(c, `select status, latest_event_at from public.subscriptions where user_id=$1`, [U]);
    assert.equal(after.status, 'expired', 'a stale RENEWAL must not overwrite a newer EXPIRATION');
    assert.equal(after.latest_event_at.getTime(), NEWER, 'latest_event_at holds the EVENT time, not the processing time');

    // and a genuinely newer event still applies
    await send('evt_repurchase', 'INITIAL_PURCHASE', 'active', NEWER + 1000, { premium: { expires_at: '2099-01-01T00:00:00Z' } });
    assert.equal((await one(c, `select status from public.subscriptions where user_id=$1`, [U])).status, 'active', 'a newer event still moves the state forward');
  });
});

test('H4/TRANSFER: revoke_rc_entitlement expires the source that RC moved purchases away from', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    // $1 is cast per column: user_id is uuid, rc_app_user_id is text — Postgres cannot deduce one
    // type for a parameter used as both.
    await c.query(`insert into public.subscriptions (user_id, rc_app_user_id, status, entitlements) values ($1::uuid,$1::text,'active',$2)`, [
      U, JSON.stringify({ premium: { expires_at: '2099-01-01T00:00:00Z' } }),
    ]);
    // RC sends the TRANSFER webhook ONLY for the destination, so nothing will ever arrive to revoke
    // the source. Without this the source keeps premium forever — one paid entitlement, two accounts.
    assert.equal((await one(c, `select public.revoke_rc_entitlement($1) as ok`, [U])).ok, true);
    const row = await one(c, `select status, entitlements from public.subscriptions where user_id=$1`, [U]);
    assert.equal(row.status, 'expired', 'source is expired');
    assert.deepEqual(row.entitlements, {}, 'entitlement cleared');
    // the row survives as the audit trail of who held what
    assert.equal(await n(c, `select count(*)::int n from public.subscriptions where user_id=$1`, [U]), 1);
    assert.equal((await one(c, `select public.revoke_rc_entitlement($1) as ok`, ['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'])).ok, false, 'revoking a stranger reports nothing revoked');
  });
});
