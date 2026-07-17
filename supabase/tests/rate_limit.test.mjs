/**
 * B13 (H9 / Backend §13) — the rate-limit primitive and the manual short-code resolver.
 * Transactional / rolled back. The Edge wiring (which scope guards which handler) is in
 * _shared/ratelimit.ts and its Deno tests; this proves the DB effects the limit actually rests on.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser } from './lib/db.mjs';

const INVITER = 'e1000000-0000-0000-0000-0000000000e1';
const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];

test('check_rate_limit: allows exactly `limit` calls per window, then refuses (§13)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    const call = () => one(c, `select public.check_rate_limit('t_scope','subject-1',3,'1 hour'::interval) as ok`);

    for (let i = 1; i <= 3; i++) assert.equal((await call()).ok, true, `call ${i} of 3 is within quota`);
    assert.equal((await call()).ok, false, 'the 4th call in the window is refused');
    assert.equal((await call()).ok, false, 'and stays refused');

    // the limit is per (scope, subject) — one user's abuse must not throttle everyone else
    assert.equal((await one(c, `select public.check_rate_limit('t_scope','subject-2',3,'1 hour'::interval) as ok`)).ok, true, 'a different subject has its own quota');
    assert.equal((await one(c, `select public.check_rate_limit('other_scope','subject-1',3,'1 hour'::interval) as ok`)).ok, true, 'a different scope has its own quota');
  });
});

test('check_rate_limit: increments and compares in ONE statement (no read-then-write race)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    // The M8 lesson applied here: a count in one round-trip and a decision in another is not a
    // limit. This pins that the counter is the returning value of the upsert itself.
    const { def } = await one(c, `select pg_get_functiondef('public.check_rate_limit(text,text,int,interval)'::regprocedure) as def`);
    assert.match(def, /on conflict[\s\S]*do update set count = public\.rate_limits\.count \+ 1[\s\S]*returning count into n/i, 'must increment+read atomically');
  });
});

test('H9: a brute-force guesser is throttled long before the code space is searchable', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    // invite_claim_code's limit is 5/hour (see _shared/ratelimit.ts LIMITS).
    const guess = () => one(c, `select public.check_rate_limit('invite_claim_code','attacker',5,'1 hour'::interval) as ok`);
    let allowed = 0;
    for (let i = 0; i < 50; i++) if ((await guess()).ok) allowed++;
    assert.equal(allowed, 5, '50 guesses in one hour yield only 5 attempts — 45 are refused');
    // 40 bits of code space at 5/hour is not searchable in any useful time; the entropy does the
    // real work (D-20) and this is the second lock, not the first.
  });
});

test('H9: resolve_invite_code resolves a typed code, and refuses what it must (the loop closes)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, INVITER);
    // token_hash is lowercase sha256 hex; the teaser shows the first 10 chars, uppercased + hyphened.
    const hash = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    await c.query(`insert into public.invites (inviter_id, token_hash, status) values ($1,$2,'created')`, [INVITER, hash]);

    // what a human actually types, in every shape they might type it
    for (const typed of ['ABCDE-F0123', 'abcde-f0123', 'ABCDEF0123', 'abcde f0123']) {
      assert.equal((await one(c, `select public.resolve_invite_code($1) as h`, [typed])).h, hash, `resolves "${typed}"`);
    }

    const rejects = async (code, re) => {
      await c.query('savepoint sp');
      await assert.rejects(c.query(`select public.resolve_invite_code($1)`, [code]), re);
      await c.query('rollback to savepoint sp');
    };
    await rejects('ABC-DEF', /code_too_short/); // the OLD 6-hex code is now too short to resolve
    await rejects('99999-99999', /invite_not_found/);
    await rejects('ZZZZZ-ZZZZZ', /code_too_short/); // non-hex is stripped → nothing left

    // an unclaimable invite must not be resolvable — it shrinks the attacker's live target pool
    await c.query(`update public.invites set status='accepted' where token_hash=$1`, [hash]);
    await rejects('ABCDE-F0123', /invite_not_found/);
    await c.query(`update public.invites set status='created', expires_at = now() - interval '1 day' where token_hash=$1`, [hash]);
    await rejects('ABCDE-F0123', /invite_not_found/);
  });
});

test('H9: an ambiguous prefix is REFUSED, never guessed between two people\'s invites', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, INVITER);
    // A 40-bit collision is rare but not impossible; handing a claimant somebody else's invite is
    // exactly the failure this code must never have, so a tie is an error, not a coin flip.
    const a = 'cafebabe00' + '1'.repeat(54);
    const b = 'cafebabe00' + '2'.repeat(54);
    await c.query(`insert into public.invites (inviter_id, token_hash, status) values ($1,$2,'created'),($1,$3,'created')`, [INVITER, a, b]);
    await assert.rejects(c.query(`select public.resolve_invite_code('CAFEB-ABE00')`), /ambiguous_code/);
  });
});
