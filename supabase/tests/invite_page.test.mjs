/**
 * P8.T3 (invite-page contract) — the `invites` lookup + K-factor transition the teaser relies on
 * (Backend §8.2). Transactional / rolled back. The HTML/OG builder is unit-tested in Deno
 * (_shared/invite-page.test.ts); this proves the DB half: a token hash resolves the invite, the
 * first visit advances created→clicked idempotently (never regressing a further state), and expiry
 * is detectable.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser } from './lib/db.mjs';

const A = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];

const markClicked = (c, hash) =>
  c.query(`update public.invites set status='clicked', clicked_at=now() where token_hash=$1 and status='created'`, [hash]);

test('invite-page: a first visit advances created → clicked (with clicked_at)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    await one(c, `insert into public.invites (inviter_id, token_hash) values ($1,'h_click') returning id`, [A]);

    const res = await markClicked(c, 'h_click');
    assert.equal(res.rowCount, 1, 'one invite advanced');
    const inv = await one(c, `select status, clicked_at from public.invites where token_hash='h_click'`);
    assert.equal(inv.status, 'clicked');
    assert.ok(inv.clicked_at, 'clicked_at stamped');
  });
});

test('invite-page: re-visits are idempotent and never regress a further-along state', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    await one(c, `insert into public.invites (inviter_id, token_hash) values ($1,'h_idem') returning id`, [A]);
    await markClicked(c, 'h_idem'); // created → clicked
    const again = await markClicked(c, 'h_idem'); // no-op now
    assert.equal(again.rowCount, 0, 'no second transition');

    // a further state (accepted) is not dragged back to clicked
    await c.query(`update public.invites set status='accepted' where token_hash='h_idem'`);
    const res = await markClicked(c, 'h_idem');
    assert.equal(res.rowCount, 0, 'accepted is not regressed');
    assert.equal((await one(c, `select status from public.invites where token_hash='h_idem'`)).status, 'accepted');
  });
});

test('invite-page: an expired invite is detectable (served the gone page)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    await one(c, `insert into public.invites (inviter_id, token_hash, expires_at) values ($1,'h_exp', now() - interval '1 day') returning id`, [A]);
    const inv = await one(c, `select (expires_at < now()) as expired from public.invites where token_hash='h_exp'`);
    assert.equal(inv.expired, true, 'past expires_at → expired');
  });
});
