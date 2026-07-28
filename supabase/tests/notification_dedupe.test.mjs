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

/**
 * Rows THIS test added — never the table's absolute count.
 *
 * `pgmq.q_push_jobs` and `notification_log` are shared with the live `pulse-fanout` cron, which
 * runs every 15 minutes and enqueues real pushes against the same staging database these tests run
 * on. An absolute `count(*) === 1` is therefore a race the suite loses whenever the cron fires
 * mid-run: on 2026-07-29 the first test saw **3**, and its five siblings were the same bug waiting
 * for their turn. Ledger §7 states the rule this restores — never assert absolute row counts on
 * tables live crons append to; measure a delta.
 *
 * Capture `baseline()` after seeding and before the enqueues under test.
 */
const baseline = async (c) => ({ q: await queueLen(c), log: await logLen(c) });
const added = async (c, b) => ({ q: (await queueLen(c)) - b.q, log: (await logLen(c)) - b.log });

// enqueue_push_deduped(user, type, title, body, deep_link, data, dedupe_key, cap_class) → bigint | null
const enqueue = async (c, { type = 'reading_ready', key = null, cls = 'exempt', user = U }) =>
  (await c.query(`select public.enqueue_push_deduped($1,$2,'T','B','palmly://x','{}'::jsonb,$3,$4) as id`, [user, type, key, cls])).rows[0].id;

test('enqueue_push_deduped: enqueues one push_jobs row and logs it', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    const b = await baseline(c);
    const id = await enqueue(c, { type: 'reading_ready', key: 'reading_ready:s1', cls: 'exempt' });
    assert.ok(id, 'returns a msg_id');
    assert.equal((await added(c, b)).q, 1);
    assert.equal((await added(c, b)).log, 1);
  });
});

test('dedupe: the same key twice in a day enqueues once (forced double-trigger)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    const b = await baseline(c);
    const first = await enqueue(c, { type: 'reading_ready', key: 'reading_ready:s1' });
    const second = await enqueue(c, { type: 'reading_ready', key: 'reading_ready:s1' });
    assert.ok(first);
    assert.equal(second, null, 'second identical trigger is deduped');
    assert.equal((await added(c, b)).q, 1, 'only one push enqueued');
  });
});

test('distinct entities each notify (different scans → different keys)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    const b = await baseline(c);
    assert.ok(await enqueue(c, { type: 'reading_ready', key: 'reading_ready:s1' }));
    assert.ok(await enqueue(c, { type: 'reading_ready', key: 'reading_ready:s2' }));
    assert.equal((await added(c, b)).q, 2);
  });
});

test('daily marketing cap: a 2nd marketing push the same day is suppressed', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    const b = await baseline(c);
    const fortune = await enqueue(c, { type: 'daily_fortune', key: 'daily_fortune', cls: 'marketing' });
    const winback = await enqueue(c, { type: 'winback', key: 'winback', cls: 'marketing' });
    assert.ok(fortune, 'first marketing push goes out');
    assert.equal(winback, null, 'second marketing push hits the daily cap');
    assert.equal((await added(c, b)).q, 1);
  });
});

test('social + pipeline events are cap-exempt (both enqueue on the same day)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    const b = await baseline(c);
    assert.ok(await enqueue(c, { type: 'compat_complete', key: 'compat_complete:pA', cls: 'exempt' }));
    assert.ok(await enqueue(c, { type: 'invite_accepted', key: 'invite_accepted:pB', cls: 'exempt' }));
    assert.ok(await enqueue(c, { type: 'reading_ready', key: 'reading_ready:s1', cls: 'exempt' }));
    assert.equal((await added(c, b)).q, 3, 'exempt events are never capped');
  });
});

test('an exempt push does not consume the marketing cap', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    const b = await baseline(c);
    await enqueue(c, { type: 'reading_ready', key: 'reading_ready:s1', cls: 'exempt' });
    const fortune = await enqueue(c, { type: 'daily_fortune', key: 'daily_fortune', cls: 'marketing' });
    assert.ok(fortune, 'marketing still allowed after an exempt send');
    assert.equal((await added(c, b)).q, 2);
  });
});

test('the cap is per-user (a second user still gets their marketing push)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    const b = await baseline(c);
    const V = 'e6000000-0000-0000-0000-0000000000e6';
    await seedUser(c, V);
    assert.ok(await enqueue(c, { type: 'daily_fortune', key: 'daily_fortune', cls: 'marketing', user: U }));
    assert.ok(await enqueue(c, { type: 'daily_fortune', key: 'daily_fortune', cls: 'marketing', user: V }), 'other user unaffected');
    assert.equal((await added(c, b)).q, 2);
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

// ── M10 (B18): one enqueue path, and a cap the DATABASE enforces ────────────────────────────────

test('M10: the raw enqueue_push is GONE — the §10 gate cannot be bypassed by calling the short name', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    // 0013's own header called itself "the single enqueue entry point", which 0014 silently
    // superseded. Leaving a no-dedupe/no-cap path granted to service_role meant §10 was enforced
    // only by remembering which function to call — and C.10 still has most of the enqueuers to add.
    assert.equal(
      await scalar(c, `select count(*)::int n from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace where ns.nspname='public' and p.proname='enqueue_push'`),
      0,
      'the raw enqueue_push must not exist',
    );
    const priv = async (role) =>
      (await c.query(`select has_function_privilege($1,'public.enqueue_push_deduped(uuid,text,text,text,text,jsonb,text,text)','execute') as ok`, [role])).rows[0].ok;
    assert.equal(await priv('service_role'), true, 'the gated path survives');
    assert.equal(await priv('authenticated'), false, 'and stays service-role only');
  });
});

test('M10: the marketing daily cap is a UNIQUE index, not a check-then-insert', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    // The race: two concurrent marketing sends both ran `if exists(...) then return null`, both saw
    // nothing, and both inserted — their dedupe keys differ, so the (user,key,day) index did not
    // stop them. Two marketing pushes, one day. The index that already existed had exactly the right
    // columns and predicate; it simply was not unique.
    const def = (await c.query(`select indexdef from pg_indexes where schemaname='public' and indexname='notification_log_marketing_daily_cap'`)).rows[0]?.indexdef;
    assert.ok(def, 'the cap index exists');
    assert.match(def, /CREATE UNIQUE INDEX/i, 'UNIQUE is what makes the cap atomic');
    assert.match(def, /user_id, sent_on/i);
    assert.match(def, /cap_class = 'marketing'/i, 'partial: only marketing is capped');

    const fdef = (await c.query(`select pg_get_functiondef('public.enqueue_push_deduped(uuid,text,text,text,text,jsonb,text,text)'::regprocedure) as f`)).rows[0].f;
    assert.ok(!/if exists \(/i.test(fdef), 'the check-then-insert pre-check must be gone');
    assert.match(fdef, /on conflict do nothing/i, 'untargeted → catches BOTH the dedupe key and the cap');
  });
});

test('M10: a second marketing push the same day is refused even with a DIFFERENT dedupe key', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    // The exact case the pre-check existed for — now enforced by the database instead of by a read.
    assert.ok(await enqueue(c, { type: 'daily_fortune', key: 'fortune:2026-07-17', cls: 'marketing' }), 'first marketing send lands');
    assert.equal(await enqueue(c, { type: 'winback', key: 'winback:2026-07-17', cls: 'marketing' }), null, 'a DIFFERENT marketing key the same day is capped');
    // exempt classes are unaffected — social + pipeline are deduped but never capped (§10)
    assert.ok(await enqueue(c, { type: 'compat_complete', key: 'compat:abc', cls: 'exempt' }), 'exempt still enqueues');
    assert.ok(await enqueue(c, { type: 'reading_ready', key: 'reading:def', cls: 'exempt' }), 'and a second exempt too');
    assert.equal(
      await scalar(c, `select count(*)::int n from public.notification_log where user_id=$1 and cap_class='marketing'`, [U]),
      1,
      'exactly one marketing row survives the day',
    );
  });
});
