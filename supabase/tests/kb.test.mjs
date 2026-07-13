/**
 * P5.T4 — KB v1 loads into `kb_chunks` and every schema enum value resolves via deterministic
 * KEYED lookup (Backend §6.5). Transactional / rolled-back against staging (no persistent write).
 *
 * The coverage + banned-claims audit itself lives in `kb/audit.mjs` (pure, schema-derived); this
 * test proves the DB half: the same 141 keys are retrievable by (kb_version, tradition,
 * feature_key) once loaded, and reads are allowed to `authenticated` (content, not user data).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, asRole } from './lib/db.mjs';
import { kbRows, loadKbInto, KB_VERSION } from '../../kb/load.mjs';
import { requiredKeys } from '../../kb/audit.mjs';

test('KB v1 loads into kb_chunks with the expected row count', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    const inserted = await loadKbInto(c);
    const n = (await c.query(`select count(*)::int n from public.kb_chunks where kb_version=$1`, [KB_VERSION])).rows[0].n;
    assert.equal(n, inserted, 'every source row inserted');
    assert.equal(inserted, kbRows().length, 'inserted all v1 rows');
    assert.equal(inserted, 141, 'v1 has 141 chunks (94 palmistry + 47 physiognomy)');
  });
});

test('every schema enum value resolves to ≥1 chunk via deterministic keyed lookup', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await loadKbInto(c);
    for (const tradition of ['palmistry', 'physiognomy']) {
      for (const key of requiredKeys(tradition)) {
        const hit = (
          await c.query(
            `select content from public.kb_chunks where kb_version=$1 and tradition=$2 and feature_key=$3`,
            [KB_VERSION, tradition, key],
          )
        ).rows;
        assert.ok(hit.length >= 1, `keyed lookup ${tradition}/${key} returned a chunk`);
        assert.ok(hit[0].content.trim().length >= 20, `${key} content non-empty`);
      }
    }
  });
});

test('the same features always retrieve the same passage (idempotent re-load, stable keys)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await loadKbInto(c);
    const key = 'heart_line.depth.deep';
    const first = (await c.query(
      `select content from public.kb_chunks where kb_version=$1 and tradition='palmistry' and feature_key=$2`,
      [KB_VERSION, key],
    )).rows;
    assert.equal(first.length, 1, 'exactly one canonical chunk per key (no ambiguity)');
    // Re-load must not duplicate (idempotent per kb_version) and must return the same content.
    await loadKbInto(c);
    const again = (await c.query(
      `select content from public.kb_chunks where kb_version=$1 and tradition='palmistry' and feature_key=$2`,
      [KB_VERSION, key],
    )).rows;
    assert.equal(again.length, 1, 're-load stays single-row (idempotent)');
    assert.equal(again[0].content, first[0].content, 'same key → same passage (consistency lever)');
  });
});

test('kb_chunks is readable by authenticated users (content, not user data)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await loadKbInto(c);
    await asRole(c, { uid: '00000000-0000-0000-0000-0000000000aa', role: 'authenticated' });
    const n = (await c.query(`select count(*)::int n from public.kb_chunks`)).rows[0].n;
    assert.equal(n, 141, 'authenticated role reads all KB chunks (kb_chunks_select_all policy)');
  });
});
