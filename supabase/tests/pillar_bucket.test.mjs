/**
 * P9.T1 — the in-DB day-pillar bucket (migration 0012) must match the canonical TS algorithm
 * (_shared/pillar.ts, Deno-tested). Transactional / rolled back. Cross-checking the two
 * implementations against the same known sexagenary values keeps fortune lookup (SQL) consistent
 * with birth-date capture (TS).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations } from './lib/db.mjs';

const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];

test('pillar_bucket(date): matches the known sexagenary buckets and the TS lib', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    const bucket = async (d) => (await one(c, `select public.pillar_bucket($1::date) as b`, [d])).b;
    assert.equal(await bucket('2000-01-07'), 'jiazi', '甲子 anchor');
    assert.equal(await bucket('2000-01-08'), 'yichou', '乙丑');
    assert.equal(await bucket('2000-01-01'), 'wuwu', '戊午');
    assert.equal(await bucket('2000-01-06'), 'guihai', '癸亥, cycle end');
    // recurs every 60 days
    assert.equal(await bucket('2000-03-07'), await bucket('2000-01-07'), '+60 days → same bucket');
  });
});

test('pillar_bucket(null): generic bucket so fortunes still render', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    assert.equal((await one(c, `select public.pillar_bucket(null) as b`)).b, 'generic');
  });
});

test('pillar_bucket yields 60 distinct buckets across a 60-day span', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    const r = await one(c, `select count(distinct public.pillar_bucket(('2000-01-07'::date + g))) as n from generate_series(0,59) g`);
    assert.equal(r.n, '60', '60 unique buckets over the cycle');
  });
});
