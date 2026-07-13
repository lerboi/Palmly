/**
 * P9.T2 (fortune coverage) — the fortune-generate DB effect (Backend §10, §3.2). Transactional /
 * rolled back. Proves next-day coverage across all 61 buckets (60 sexagenary via the in-DB
 * pillar_bucket + generic), the (date,bucket,locale) primary key, idempotent upsert, and that
 * fortune_templates is readable by authenticated (content, not user data). The generation +
 * schema/audit are covered in Deno (fortune.test.ts) and the live smoke (eval/p9t2.ts).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, asRole } from './lib/db.mjs';

const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];
const n = async (c, sql, p = []) => (await c.query(sql, p)).rows[0].n;
const D = '2026-07-14';

// generate all 61 buckets for the date using the real in-DB bucket function (the same 60 sexagenary
// buckets fortune-generate iterates + generic)
const seedCoverage = (c) =>
  c.query(
    `insert into public.fortune_templates (fortune_date, pillar_bucket, locale, content, model_id, prompt_version)
       select $1::date, public.pillar_bucket('2000-01-07'::date + g), 'en', '{"overall":"a day of small beginnings"}'::jsonb, 'gemini-3.1-flash-lite', 'fortune.v1'
       from generate_series(0,59) g
     union all
       select $1::date, 'generic', 'en', '{"overall":"a warm, universal day"}'::jsonb, 'gemini-3.1-flash-lite', 'fortune.v1'`,
    [D],
  );

test('fortune-generate coverage: all 61 buckets for a date, one row each', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedCoverage(c);
    assert.equal(await n(c, `select count(*)::int n from public.fortune_templates where fortune_date=$1`, [D]), 61, '60 sexagenary + generic');
    assert.equal(await n(c, `select count(distinct pillar_bucket)::int n from public.fortune_templates where fortune_date=$1`, [D]), 61, 'all buckets distinct');
    assert.equal(await n(c, `select count(*)::int n from public.fortune_templates where fortune_date=$1 and pillar_bucket='generic'`, [D]), 1, 'generic present');
  });
});

test('fortune_templates: (date,bucket,locale) pk → idempotent upsert (refresh, no duplicate)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedCoverage(c);
    // re-run the nightly job for the same date → upsert refreshes content, no new rows
    await c.query(
      `insert into public.fortune_templates (fortune_date, pillar_bucket, locale, content)
       values ($1,'jiazi','en','{"overall":"refreshed"}')
       on conflict (fortune_date, pillar_bucket, locale) do update set content = excluded.content`,
      [D],
    );
    assert.equal(await n(c, `select count(*)::int n from public.fortune_templates where fortune_date=$1`, [D]), 61, 'still 61 rows');
    assert.equal((await one(c, `select content->>'overall' o from public.fortune_templates where fortune_date=$1 and pillar_bucket='jiazi'`, [D])).o, 'refreshed', 'content refreshed');
  });
});

test('fortune_templates is readable by authenticated (content, not user data)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedCoverage(c);
    await asRole(c, { uid: '00000000-0000-0000-0000-0000000000f1', role: 'authenticated' });
    assert.equal(await n(c, `select count(*)::int n from public.fortune_templates where fortune_date=$1`, [D]), 61, 'authenticated reads all fortunes');
  });
});
