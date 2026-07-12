/**
 * P3.T3 — Storage bucket RLS proofs (Backend spec §3.3 verify):
 * user A uploads to own path + cannot read user B's object; public card URL fetches anonymously.
 * Transactional/rolled-back against staging.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, asRole, resetRole, seedUser } from './lib/db.mjs';

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';

async function setup(c) {
  await applyMigrations(c);
  // the on_auth_user_created trigger (migration 0005) auto-creates each profile row.
  for (const u of [A, B]) await seedUser(c, u);
}

const countObjects = async (c, bucket) =>
  (await c.query(`select count(*)::int n from storage.objects where bucket_id = $1`, [bucket])).rows[0].n;

async function expectDenied(c, sql, params, label) {
  await c.query('savepoint sp');
  let err = null;
  try {
    await c.query(sql, params);
  } catch (e) {
    err = e;
    await c.query('rollback to savepoint sp');
  }
  if (!err) await c.query('release savepoint sp');
  assert.ok(err, `${label} — should be denied`);
  assert.equal(err.code, '42501', `${label} — must be RLS/permission (got ${err.code})`);
}

test('buckets: scans is private, cards is public', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    const rows = (
      await c.query(`select id, public from storage.buckets where id in ('scans','cards') order by id`)
    ).rows;
    const pub = Object.fromEntries(rows.map((r) => [r.id, r.public]));
    assert.equal(pub.scans, false, 'scans bucket private');
    assert.equal(pub.cards, true, 'cards bucket public');
  });
});

test('scans bucket: owner reads/writes own path; stranger cannot read or write into it', async () => {
  await withRollback(async (c) => {
    await setup(c);
    // A's crop already uploaded (seeded as superuser at A's path)
    await c.query(`insert into storage.objects (bucket_id, name, owner) values ('scans', $1, $2)`, [
      `${A}/scan1.jpg`,
      A,
    ]);

    await asRole(c, { uid: A });
    assert.equal(await countObjects(c, 'scans'), 1, 'A sees own crop');
    await c.query(`insert into storage.objects (bucket_id, name, owner) values ('scans', $1, $2)`, [
      `${A}/scan2.jpg`,
      A,
    ]); // A uploads to own path
    await resetRole(c);

    await asRole(c, { uid: B });
    assert.equal(await countObjects(c, 'scans'), 0, "B cannot see A's crops");
    await expectDenied(
      c,
      `insert into storage.objects (bucket_id, name, owner) values ('scans', $1, $2)`,
      [`${A}/hijack.jpg`, B],
      "B writing into A's folder",
    );
    await resetRole(c);
  });
});

test('cards bucket: publicly readable by the anonymous role', async () => {
  await withRollback(async (c) => {
    await setup(c);
    await c.query(`insert into storage.objects (bucket_id, name) values ('cards', 'reading-abc.png')`);

    // the truly-unauthenticated `anon` role (public CDN request path) can read
    await asRole(c, { role: 'anon' });
    assert.equal(await countObjects(c, 'cards'), 1, 'anonymous can read a public card');
    await resetRole(c);
  });
});
