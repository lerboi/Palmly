/**
 * P9.T5 (notification caps + dedupe) — the server-side §10 gate (migration 0014). Transactional /
 * rolled back. The copy rendering is unit-tested in Deno (_shared/notif-templates.test.ts); here we
 * prove the DB behavior enqueue_push_deduped guarantees: entity dedupe, the hard 1/day marketing
 * cap, and that social + pipeline events are cap-exempt (but still deduped).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser } from './lib/db.mjs';

const U = 'e5000000-0000-0000-0000-0000000000e5';
const scalar = async (c, sql, p = []) => (await c.query(sql, p)).rows[0]?.n;
const queueLen = (c) => scalar(c, `select count(*)::int n from pgmq.q_push_jobs`);
const logLen = (c) => scalar(c, `select count(*)::int n from public.notification_log`);

// enqueue_push_deduped(user, type, title, body, deep_link, data, dedupe_key, cap_class) → bigint | null
const enqueue = async (c, { type = 'reading_ready', key = null, cls = 'exempt', user = U }) =>
  (await c.query(`select public.enqueue_push_deduped($1,$2,'T','B','palmly://x','{}'::jsonb,$3,$4) as id`, [user, type, key, cls])).rows[0].id;

test('enqueue_push_deduped: enqueues one push_jobs row and logs it', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    const id = await enqueue(c, { type: 'reading_ready', key: 'reading_ready:s1', cls: 'exempt' });
    assert.ok(id, 'returns a msg_id');
    assert.equal(await queueLen(c), 1);
    assert.equal(await logLen(c), 1);
  });
});

test('dedupe: the same key twice in a day enqueues once (forced double-trigger)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    const first = await enqueue(c, { type: 'reading_ready', key: 'reading_ready:s1' });
    const second = await enqueue(c, { type: 'reading_ready', key: 'reading_ready:s1' });
    assert.ok(first);
    assert.equal(second, null, 'second identical trigger is deduped');
    assert.equal(await queueLen(c), 1, 'only one push enqueued');
  });
});

test('distinct entities each notify (different scans → different keys)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    assert.ok(await enqueue(c, { type: 'reading_ready', key: 'reading_ready:s1' }));
    assert.ok(await enqueue(c, { type: 'reading_ready', key: 'reading_ready:s2' }));
    assert.equal(await queueLen(c), 2);
  });
});

test('daily marketing cap: a 2nd marketing push the same day is suppressed', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    const fortune = await enqueue(c, { type: 'daily_fortune', key: 'daily_fortune', cls: 'marketing' });
    const winback = await enqueue(c, { type: 'winback', key: 'winback', cls: 'marketing' });
    assert.ok(fortune, 'first marketing push goes out');
    assert.equal(winback, null, 'second marketing push hits the daily cap');
    assert.equal(await queueLen(c), 1);
  });
});

test('social + pipeline events are cap-exempt (both enqueue on the same day)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    assert.ok(await enqueue(c, { type: 'compat_complete', key: 'compat_complete:pA', cls: 'exempt' }));
    assert.ok(await enqueue(c, { type: 'invite_accepted', key: 'invite_accepted:pB', cls: 'exempt' }));
    assert.ok(await enqueue(c, { type: 'reading_ready', key: 'reading_ready:s1', cls: 'exempt' }));
    assert.equal(await queueLen(c), 3, 'exempt events are never capped');
  });
});

test('an exempt push does not consume the marketing cap', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    await enqueue(c, { type: 'reading_ready', key: 'reading_ready:s1', cls: 'exempt' });
    const fortune = await enqueue(c, { type: 'daily_fortune', key: 'daily_fortune', cls: 'marketing' });
    assert.ok(fortune, 'marketing still allowed after an exempt send');
    assert.equal(await queueLen(c), 2);
  });
});

test('the cap is per-user (a second user still gets their marketing push)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    const V = 'e6000000-0000-0000-0000-0000000000e6';
    await seedUser(c, V);
    assert.ok(await enqueue(c, { type: 'daily_fortune', key: 'daily_fortune', cls: 'marketing', user: U }));
    assert.ok(await enqueue(c, { type: 'daily_fortune', key: 'daily_fortune', cls: 'marketing', user: V }), 'other user unaffected');
    assert.equal(await queueLen(c), 2);
  });
});

test('notification_log is service-role only (no client access)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    const { asRole } = await import('./lib/db.mjs');
    await asRole(c, { uid: U, role: 'authenticated' });
    assert.equal(await scalar(c, `select count(*)::int n from public.notification_log`), 0, 'RLS: no rows visible to a client');
  });
});
