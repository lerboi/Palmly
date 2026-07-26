/**
 * RF1.T1 (Audit-5 · 03 §2) — the pulse schema against the deployed database. Transactional /
 * rolled back, so nothing here persists to staging.
 *
 * Three things are being proven, and they are the three that would hurt in production:
 *   • `pulse_templates` behaves like `fortune_templates` — (date, feature, locale) is a real PK,
 *     the upsert is idempotent, and the content is readable by any authenticated user (it is
 *     content, not user data);
 *   • `user_fortunes` gained its ledger columns without disturbing what was already there;
 *   • `record_daily_open` is honest under every condition that will actually occur — a second
 *     device on the same day, a re-seal, a broken run, a timezone straddling midnight, and a client
 *     that tries to backfill a streak it never had.
 *
 * Requires migration `20260726000036_rf1_pulse_schema` to be applied (`supabase db push`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, asRole, resetRole, seedUser } from './lib/db.mjs';

const A = 'aaaaaaaa-0000-4000-8000-00000000ab01';
const B = 'bbbbbbbb-0000-4000-8000-00000000ab02';
const D = '2026-07-26';
/** The RPC clamps to ±1 UTC day, so every ledger assertion has to run against the real today. */
const today = () => new Date().toISOString().slice(0, 10);

const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];
const n = async (c, sql, p = []) => (await c.query(sql, p)).rows[0].n;

/**
 * Assert a statement raises, WITHOUT poisoning the outer transaction.
 *
 * In Postgres a failed statement aborts the whole transaction — every later command, including the
 * `resetRole` these tests end with, then fails with "current transaction is aborted" and the real
 * assertion is lost behind a cascade. A SAVEPOINT is the standard containment: roll back to it and
 * the transaction is usable again. Returns the error so the caller can assert on it.
 */
async function raises(c, sql, params = [], match) {
  await c.query('savepoint expect_raise');
  let err = null;
  try {
    await c.query(sql, params);
  } catch (e) {
    err = e;
  }
  await c.query('rollback to savepoint expect_raise');
  assert.ok(err, `expected a failure from: ${sql.trim().slice(0, 70)}`);
  if (match) assert.match(err.message, match, `wrong failure: ${err.message}`);
  return err;
}

const FEATURES = [
  'heart', 'head', 'life', 'fate', 'hand_shape', 'mounts', 'markings',
  'face_shape', 'proportion', 'eyes', 'eyebrows', 'nose', 'mouth', 'ears', 'canthus',
];

const CONTENT = JSON.stringify({
  essence: 'Your heart line favours patience today.',
  reading: 'Two sentences of reading.',
  career: 'One line.', love: 'One line.', wealth: 'One line.',
  watch: 'One line.', chapter_tone: 'One line.',
});

async function setup(c) {
  await applyMigrations(c);
  for (const u of [A, B]) await seedUser(c, u);
}

const seedDay = (c, date = D) =>
  c.query(
    `insert into public.pulse_templates (pulse_date, feature_key, locale, day_pillar, content, model_id, prompt_version)
       select $1::date, k, 'en', '甲子', $2::jsonb, 'gemini-3.1-flash-lite', 'pulse.v1'
         from unnest($3::text[]) k`,
    [date, CONTENT, FEATURES],
  );

// ── pulse_templates ──────────────────────────────────────────────────────────────────────────────

test('pulse_templates: a night is 15 rows, one per feature key', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await seedDay(c);
    assert.equal(await n(c, `select count(*)::int n from public.pulse_templates where pulse_date=$1`, [D]), 15);
    assert.equal(await n(c, `select count(distinct feature_key)::int n from public.pulse_templates where pulse_date=$1`, [D]), 15);
  });
});

test('pulse_templates: (date, feature, locale) PK → the nightly re-run upserts, never duplicates', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await seedDay(c);
    await c.query(
      `insert into public.pulse_templates (pulse_date, feature_key, locale, day_pillar, content)
       values ($1,'heart','en','甲子','{"essence":"refreshed"}')
       on conflict (pulse_date, feature_key, locale) do update set content = excluded.content`,
      [D],
    );
    assert.equal(await n(c, `select count(*)::int n from public.pulse_templates where pulse_date=$1`, [D]), 15, 'still 15');
    const row = await one(c, `select content->>'essence' e from public.pulse_templates where pulse_date=$1 and feature_key='heart'`, [D]);
    assert.equal(row.e, 'refreshed');
  });
});

test('pulse_templates: the feature_key CHECK rejects a key no reading can produce', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await raises(
      c,
      `insert into public.pulse_templates (pulse_date, feature_key, locale, day_pillar, content)
       values ($1,'forehead','en','甲子','{}')`,
      [D],
      /violates check constraint/,
    );
  });
});

test('pulse_templates is readable by any authenticated user (content, not user data)', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await seedDay(c);
    await asRole(c, { uid: A });
    assert.equal(await n(c, `select count(*)::int n from public.pulse_templates where pulse_date=$1`, [D]), 15);
    await resetRole(c);
  });
});

test('pulse_templates is NOT writable by a user (only the secret-mode generator writes)', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await asRole(c, { uid: A });
    const err = await raises(
      c,
      `insert into public.pulse_templates (pulse_date, feature_key, locale, day_pillar, content)
       values ($1,'heart','en','甲子','{"essence":"mine"}')`,
      [D],
    );
    assert.equal(err.code, '42501', 'no insert policy exists for authenticated');
    await resetRole(c);
  });
});

// ── user_fortunes ledger columns ─────────────────────────────────────────────────────────────────

test('user_fortunes gained its ledger columns, all nullable and additive', async () => {
  await withRollback(async (c) => {
    await setup(c);
    const cols = (
      await c.query(
        `select column_name, is_nullable from information_schema.columns
          where table_schema='public' and table_name='user_fortunes'
            and column_name in ('pulse_feature_key','revealed_at','sealed_at','seal_method','day_pillar')
          order by column_name`,
      )
    ).rows;
    assert.equal(cols.length, 5, 'all five columns exist — run supabase db push');
    for (const col of cols) assert.equal(col.is_nullable, 'YES', `${col.column_name} must be nullable`);
  });
});

test('user_fortunes: seal_method accepts tap/palm and rejects anything else', async () => {
  await withRollback(async (c) => {
    await setup(c);
    for (const m of ['tap', 'palm']) {
      await c.query(
        `insert into public.user_fortunes (user_id, fortune_date, pillar_bucket, seal_method)
         values ($1, $2::date + (case when $3='tap' then 0 else 1 end), 'generic', $3)`,
        [A, D, m],
      );
    }
    await raises(
      c,
      `insert into public.user_fortunes (user_id, fortune_date, pillar_bucket, seal_method)
       values ($1,'2026-07-30','generic','fingerprint')`,
      [A],
      /violates check constraint/,
    );
  });
});

// ── record_daily_open ────────────────────────────────────────────────────────────────────────────

/** Call the RPC as a given user, at a given date, returning its single row. */
async function record(c, uid, { date, bucket = 'generic', feature = 'heart', method = null, revealed = false }) {
  await asRole(c, { uid });
  const row = await one(c, `select * from public.record_daily_open($1::date,$2,$3,$4,$5)`, [date, bucket, feature, method, revealed]);
  await resetRole(c);
  return row;
}

/** Seal `days` consecutive days ending `offset` days before today — history the RPC's clamp forbids
 *  a client from writing, seeded directly so the streak walk has something real to walk. */
const seedRun = (c, uid, days, offset = 1) =>
  c.query(
    `insert into public.user_fortunes (user_id, fortune_date, pillar_bucket, sealed_at, seal_method)
       select $1, current_date - $2::int - g, 'generic', now(), 'tap' from generate_series(0, $3::int - 1) g
     on conflict (user_id, fortune_date) do update set sealed_at = excluded.sealed_at`,
    [uid, offset, days],
  );

test('record_daily_open: opening without sealing records the day but starts no streak', async () => {
  await withRollback(async (c) => {
    await setup(c);
    const r = await record(c, A, { date: today() });
    assert.equal(r.current_streak, 0, 'an open is not a seal');
    assert.equal(r.first_seal_today, false);
    const row = await one(c, `select opened_at, sealed_at, pulse_feature_key, day_pillar from public.user_fortunes where user_id=$1`, [A]);
    assert.ok(row.opened_at, 'opened_at stamped');
    assert.equal(row.sealed_at, null);
    assert.equal(row.pulse_feature_key, 'heart');
    assert.ok(row.day_pillar, 'the date pillar is stamped server-side');
  });
});

test('record_daily_open: a tap seals the day, and it is worth exactly the same as a palm', async () => {
  await withRollback(async (c) => {
    await setup(c);
    const r = await record(c, A, { date: today(), method: 'tap', revealed: true });
    assert.equal(r.current_streak, 1);
    assert.equal(r.first_seal_today, true, 'the milestone celebration fires on this');
    const row = await one(c, `select sealed_at, seal_method, revealed_at from public.user_fortunes where user_id=$1`, [A]);
    assert.ok(row.sealed_at);
    assert.ok(row.revealed_at);
    assert.equal(row.seal_method, 'tap');
  });
});

test('record_daily_open: idempotent — a second device the same day does not double-count or re-celebrate', async () => {
  await withRollback(async (c) => {
    await setup(c);
    const first = await record(c, A, { date: today(), method: 'tap', revealed: true });
    const second = await record(c, A, { date: today(), method: 'tap', revealed: true });
    assert.equal(first.first_seal_today, true);
    assert.equal(second.first_seal_today, false, 'the second device must not re-celebrate');
    assert.equal(second.current_streak, 1, 'still one day, not two');
    assert.equal(await n(c, `select count(*)::int n from public.user_fortunes where user_id=$1`, [A]), 1);
  });
});

test('record_daily_open: the palm ritual UPGRADES a tap, and a later tap never downgrades a palm', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await record(c, A, { date: today(), method: 'tap', revealed: true });
    await record(c, A, { date: today(), method: 'palm', revealed: true });
    assert.equal((await one(c, `select seal_method m from public.user_fortunes where user_id=$1`, [A])).m, 'palm');
    await record(c, A, { date: today(), method: 'tap', revealed: true });
    assert.equal((await one(c, `select seal_method m from public.user_fortunes where user_id=$1`, [A])).m, 'palm', 'no downgrade');
  });
});

test('record_daily_open: the streak walks a real consecutive run', async () => {
  await withRollback(async (c) => {
    await setup(c);
    // 11 sealed days ending yesterday, then today's seal → 12.
    await seedRun(c, A, 11);
    const r = await record(c, A, { date: today(), method: 'tap', revealed: true });
    assert.equal(r.current_streak, 12);
    assert.equal(r.longest_streak, 12);
  });
});

test('record_daily_open: a missed day breaks the run, and longest_streak remembers the old one', async () => {
  await withRollback(async (c) => {
    await setup(c);
    // A 5-day run that ended a fortnight ago, then nothing until today.
    await seedRun(c, A, 5, 13);
    const r = await record(c, A, { date: today(), method: 'tap', revealed: true });
    assert.equal(r.current_streak, 1, 'today starts a new run — the old one is history, not a claim');
    assert.equal(r.longest_streak, 5, 'but the record stands');
  });
});

test('record_daily_open: a run that reaches yesterday is still alive before today is sealed', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await seedRun(c, A, 3);
    const r = await record(c, A, { date: today() }); // opened, not sealed
    assert.equal(r.current_streak, 3, 'a streak is not broken until a day is actually missed');
  });
});

test('record_daily_open: the ±1-day clamp refuses a backfilled streak', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await asRole(c, { uid: A });
    // Each raise is contained in its own savepoint, so the SECOND assertion is really exercised —
    // without that, an aborted transaction makes every later statement "fail" for the wrong reason
    // and the test passes vacuously.
    await raises(c, `select * from public.record_daily_open(current_date - 30,'generic','heart','tap',true)`, [], /date_out_of_range/);
    await raises(c, `select * from public.record_daily_open(current_date + 5,'generic','heart','tap',true)`, [], /date_out_of_range/);
    await resetRole(c);
  });
});

test('record_daily_open: ±1 day IS allowed — a timezone straddling UTC midnight must still count', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await asRole(c, { uid: A });
    for (const d of ['current_date - 1', 'current_date', 'current_date + 1']) {
      await c.query(`select * from public.record_daily_open(${d},'generic','heart','tap',true)`);
    }
    await resetRole(c);
    assert.equal(await n(c, `select count(*)::int n from public.user_fortunes where user_id=$1`, [A]), 3, 'UTC-12..+14 all fit');
  });
});

test('record_daily_open: one user can never touch or see another user’s ledger', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await seedRun(c, B, 10, 0);
    // A's own RPC call sees only A's (empty) history — B's 10-day run must not leak into it.
    const r = await record(c, A, { date: today(), method: 'tap', revealed: true });
    assert.equal(r.current_streak, 1);
    assert.equal(r.longest_streak, 1);

    await asRole(c, { uid: A });
    assert.equal(await n(c, `select count(*)::int n from public.user_fortunes where user_id=$1`, [B]), 0, "B's ledger is invisible to A");
    await resetRole(c);
  });
});

test('record_daily_open: an unauthenticated caller is refused', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await asRole(c, { role: 'anon' });
    const err = await raises(c, `select * from public.record_daily_open(current_date,'generic','heart','tap',true)`);
    assert.ok(err.code === '42501' || /not_authenticated|permission denied/.test(err.message), `unexpected: ${err.message}`);
    await resetRole(c);
  });
});

test('record_daily_open: an unrecognised seal method is ignored rather than stored', async () => {
  await withRollback(async (c) => {
    await setup(c);
    const r = await record(c, A, { date: today(), method: 'fingerprint', revealed: true });
    assert.equal(r.first_seal_today, false, 'a junk method seals nothing');
    const row = await one(c, `select sealed_at, seal_method from public.user_fortunes where user_id=$1`, [A]);
    assert.equal(row.seal_method, null);
    assert.equal(row.sealed_at, null);
  });
});

test('merge_accounts still adopts the ledger after the new columns', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    // merge_accounts refuses a non-anonymous loser (the account-theft guard), so the loser has to
    // be seeded anonymous — which is also the only shape this merge ever has in production.
    await seedUser(c, B, { isAnonymous: true });
    await c.query(`update public.profiles set is_anonymous = true where id = $1`, [B]);
    await c.query(
      `insert into public.user_fortunes (user_id, fortune_date, pillar_bucket, sealed_at, seal_method, pulse_feature_key)
       values ($1, current_date - 1, 'generic', now(), 'palm', 'fate')`,
      [B],
    );
    await c.query(
      `insert into public.user_fortunes (user_id, fortune_date, pillar_bucket, sealed_at, seal_method)
       values ($1, current_date, 'generic', now(), 'tap')`,
      [A],
    );
    await c.query(`select public.merge_accounts($1,$2)`, [A, B]);
    assert.equal(await n(c, `select count(*)::int n from public.user_fortunes where user_id=$1`, [A]), 2, 'the loser’s day was adopted');
    assert.equal(await n(c, `select count(*)::int n from public.user_fortunes where user_id=$1`, [B]), 0);
    const adopted = await one(c, `select seal_method, pulse_feature_key from public.user_fortunes where user_id=$1 and fortune_date = current_date - 1`, [A]);
    assert.equal(adopted.seal_method, 'palm', 'the new columns travel with the row');
    assert.equal(adopted.pulse_feature_key, 'fate');
  });
});
