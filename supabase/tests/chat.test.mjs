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
    // Isolate from the live KB: since D1.T3 (Audit-3) the 141 production kb_chunks carry real
    // embeddings, so kb_search would return them alongside the seeded rows and skew the exact-count
    // assertions below. Clearing here (inside the rolled-back txn — restored on rollback) makes the
    // test hermetic regardless of live KB state.
    await c.query('delete from public.kb_chunks');
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
    // Isolate from the live KB (see the ranking test above): D1.T3 populated real embeddings on the
    // 141 production kb_chunks, so kb_search would otherwise return them too. Cleared in-txn, restored
    // on rollback.
    await c.query('delete from public.kb_chunks');
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

test('H5: chat history is the MOST RECENT 8 turns, not the eight oldest', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    const tid = (await c.query(`insert into public.chat_threads (user_id) values ($1) returning id`, [U])).rows[0].id;
    // 10 turns; each row inserted separately so the thread has a real history
    for (let i = 1; i <= 10; i++) {
      await c.query(`insert into public.chat_messages (thread_id, role, content) values ($1,'user',$2)`, [tid, `m${i}`]);
    }

    // What chat-send does NOW: most recent 8 by seq, then reversed into chronological order.
    const recent = (
      await c.query(`select content from public.chat_messages where thread_id=$1 order by seq desc limit 8`, [tid])
    ).rows.map((r) => r.content).reverse();
    assert.deepEqual(recent, ['m3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10'], 'the model sees the latest 8, in chronological order');

    // What it did BEFORE (order created_at ascending, limit 8) — the bug: a thread longer than 8
    // messages conversed against its first 8 forever, never seeing anything the user just said.
    const oldest = (
      await c.query(`select content from public.chat_messages where thread_id=$1 order by created_at asc limit 8`, [tid])
    ).rows.map((r) => r.content);
    assert.ok(!oldest.includes('m10'), 'the OLD query genuinely could not see the newest turn (this is H5)');
  });
});

test('H5: seq orders a turn deterministically where created_at cannot', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    const tid = (await c.query(`insert into public.chat_threads (user_id) values ($1) returning id`, [U])).rows[0].id;
    // chat-send inserts BOTH rows of a turn in ONE statement. now() is transaction_timestamp(), so
    // they share a created_at and the uuid pk is random — ordering by created_at cannot tell the
    // question from the answer. seq can.
    await c.query(`insert into public.chat_messages (thread_id, role, content) values ($1,'user','q'),($1,'assistant','a')`, [tid]);
    const rows = (await c.query(`select role, content, created_at, seq from public.chat_messages where thread_id=$1 order by seq asc`, [tid])).rows;
    assert.equal(rows.length, 2);
    assert.equal(rows[0].created_at.getTime(), rows[1].created_at.getTime(), 'both rows of a turn DO share created_at (why seq exists)');
    assert.ok(rows[0].seq < rows[1].seq, 'seq is monotonic and distinct');
    assert.deepEqual(rows.map((r) => r.role), ['user', 'assistant'], 'seq recovers question-then-answer unambiguously');
  });
});

test('M12b: an assistant turn keeps its citations at rest', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, U);
    const tid = (await c.query(`insert into public.chat_threads (user_id) values ($1) returning id`, [U])).rows[0].id;
    const cites = [{ feature_key: 'heart_line.depth.deep', label: 'your heart line' }];
    await c.query(`insert into public.chat_messages (thread_id, role, content, citations) values ($1,'assistant',$2,$3)`, [tid, 'Your heart line is deep.', JSON.stringify(cites)]);

    // Reloading the thread must still carry the "cites your…" trust line — before this, citations
    // lived only in the HTTP response and a reloaded thread looked ungrounded.
    await asRole(c, { uid: U, role: 'authenticated' });
    const row = (await c.query(`select citations from public.chat_messages where thread_id=$1`, [tid])).rows[0];
    assert.deepEqual(row.citations, cites, 'citations survive a reload, readable by the owner');
    await resetRole(c);
  });
});
