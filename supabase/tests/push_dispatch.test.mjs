/**
 * P9.T4 (push backend) — the DB effects the push-dispatch worker relies on (Backend §10).
 * Transactional / rolled back. The Expo send + preference/quiet-hours gating + DeviceNotRegistered
 * classification are unit-tested in Deno (_shared/push.test.ts); here we prove the enqueue path writes
 * a well-formed push_jobs message, device resolution, and token pruning. The live "lands on a
 * device" verify needs real Expo tokens (device H1).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser } from './lib/db.mjs';

const U = 'f9000000-0000-0000-0000-0000000000f9';
const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];
const n = async (c, sql, p = []) => (await c.query(sql, p)).rows[0].n;

test('enqueue_push_deduped writes a well-formed push_jobs message', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    // M10/B18: the raw `enqueue_push` is GONE (migration 0029) — it bypassed the §10 dedupe + cap
    // gate entirely, and this test was its last caller anywhere in the repo; the only real enqueuer
    // (worker-compat:110) already used the deduped path.
    await one(c, `select public.enqueue_push_deduped($1,'compat_complete','The thread is tied','You scored 82','palmly://compat/x','{"pair_id":"x"}'::jsonb,'compat:x','exempt') as id`, [U]);
    const msg = await one(c, `select message from public.queue_read('push_jobs', 30, 1)`);
    assert.equal(msg.message.user_id, U);
    assert.equal(msg.message.type, 'compat_complete');
    assert.equal(msg.message.title, 'The thread is tied');
    assert.equal(msg.message.deep_link, 'palmly://compat/x');
    assert.equal(msg.message.data.pair_id, 'x');
  });
});

test('push-dispatch device resolution: a user\'s devices with tokens are found', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    await c.query(`insert into public.devices (user_id, expo_push_token, platform, timezone) values ($1,'ExpoTokA','ios','Asia/Singapore'),($1,'ExpoTokB','android','America/New_York')`, [U]);
    assert.equal(await n(c, `select count(*)::int n from public.devices where user_id=$1 and expo_push_token is not null`, [U]), 2, 'both device tokens resolved');
  });
});

test('DeviceNotRegistered pruning: deleting by expo_push_token removes the dead device', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    await c.query(`insert into public.devices (user_id, expo_push_token, platform) values ($1,'DeadTok','ios'),($1,'LiveTok','ios')`, [U]);
    await c.query(`delete from public.devices where expo_push_token = any($1)`, [['DeadTok']]);
    assert.equal(await n(c, `select count(*)::int n from public.devices where user_id=$1`, [U]), 1, 'dead token pruned, live kept');
    assert.equal((await one(c, `select expo_push_token t from public.devices where user_id=$1`, [U])).t, 'LiveTok');
  });
});

test('devices RLS: a user reads/writes only their own device rows (push-token isolation)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    const V = 'fa000000-0000-0000-0000-0000000000fa';
    await seedUser(c, V);
    await c.query(`insert into public.devices (user_id, expo_push_token, platform) values ($1,'MineTok','ios')`, [U]);
    const { asRole } = await import('./lib/db.mjs');
    await asRole(c, { uid: V, role: 'authenticated' });
    assert.equal(await n(c, `select count(*)::int n from public.devices`), 0, 'stranger sees no devices (RLS)');
  });
});
