/**
 * P9.T6 (chat) — the DB-specific pieces: pgvector KB retrieval (`kb_search`, migration 0015) and
 * chat_threads/chat_messages RLS isolation. Transactional / rolled back. The deflection guard,
 * grounding merge, chips and prompt build are unit-tested in Deno (_shared/chat.test.ts); the live
 * grounded answer is in eval/p9t6.ts. Embeddings here are synthetic basis vectors so the cosine
 * ordering is exact and deterministic (no network).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser, asRole, resetRole } from './lib/db.mjs';

const U = 'c7000000-0000-0000-0000-0000000000c7';
const V = 'c8000000-0000-0000-0000-0000000000c8';
const DIMS = 1024;

// pgvector literal with `val` at index `idx`, zeros elsewhere (a basis vector).
const basis = (idx, val = 1) => {
  const a = new Array(DIMS).fill(0);
  a[idx] = val;
  return '[' + a.join(',') + ']';
};
// a mixed query vector: {index: weight}
const mix = (pairs) => {
  const a = new Array(DIMS).fill(0);
  for (const [i, v] of Object.entries(pairs)) a[i] = v;
  return '[' + a.join(',') + ']';
};

test('kb_search ranks the nearest KB chunk first (pgvector cosine distance)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await c.query(
      `insert into public.kb_chunks (kb_version, tradition, feature_key, content, embedding) values
         ('v1','palmistry','test.a','Chunk A',$1::vector),
         ('v1','palmistry','test.b','Chunk B',$2::vector),
         ('v1','palmistry','test.c','Chunk C',$3::vector)`,
      [basis(0), basis(1), basis(2)],
    );
    // query strongly aligned with basis(1) → chunk B nearest, A next, C last
    const q = mix({ 1: 0.9, 0: 0.1 });
    const rows = (await c.query(`select feature_key, distance from public.kb_search($1,'v1','palmistry',3)`, [q])).rows;
    assert.equal(rows.length, 3);
    assert.equal(rows[0].feature_key, 'test.b', 'nearest chunk ranked first');
    assert.ok(rows[0].distance <= rows[1].distance && rows[1].distance <= rows[2].distance, 'ascending distance');
  });
});

test('kb_search filters by tradition and honors k', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await c.query(
      `insert into public.kb_chunks (kb_version, tradition, feature_key, content, embedding) values
         ('v1','palmistry','palm.one','P1',$1::vector),
         ('v1','palmistry','palm.two','P2',$2::vector),
         ('v1','physiognomy','face.one','F1',$3::vector)`,
      [basis(0), basis(1), basis(2)],
    );
    const q = basis(2);
    const face = (await c.query(`select feature_key from public.kb_search($1,'v1','physiognomy',6)`, [q])).rows;
    assert.equal(face.length, 1, 'tradition filter excludes palmistry');
    assert.equal(face[0].feature_key, 'face.one');

    const capped = (await c.query(`select feature_key from public.kb_search($1,'v1','palmistry',1)`, [q])).rows;
    assert.equal(capped.length, 1, 'k limit honored');

    const nullEmbed = (await c.query(`select count(*)::int n from public.kb_search($1,'v1',null,20)`, [q])).rows[0].n;
    assert.equal(nullEmbed, 3, 'null tradition searches all traditions');
  });
});

test('chat RLS: owner reads own thread + messages; a stranger sees neither', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    await seedUser(c, V);
    const tid = (await c.query(`insert into public.chat_threads (user_id) values ($1) returning id`, [U])).rows[0].id;
    await c.query(`insert into public.chat_messages (thread_id, role, content) values ($1,'user','hi'),($1,'assistant','hello')`, [tid]);

    await asRole(c, { uid: U, role: 'authenticated' });
    assert.equal((await c.query(`select count(*)::int n from public.chat_threads`)).rows[0].n, 1, 'owner sees own thread');
    assert.equal((await c.query(`select count(*)::int n from public.chat_messages`)).rows[0].n, 2, 'owner sees own messages (via thread_owner)');

    await resetRole(c);
    await asRole(c, { uid: V, role: 'authenticated' });
    assert.equal((await c.query(`select count(*)::int n from public.chat_threads`)).rows[0].n, 0, 'stranger sees no threads');
    assert.equal((await c.query(`select count(*)::int n from public.chat_messages`)).rows[0].n, 0, 'stranger sees no messages');
  });
});
