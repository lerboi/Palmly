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

// `name` scopes the count to this test's own seeded object — staging carries committed objects
// that the rollback harness isolates us from writing to, but not from reading.
const countObjects = async (c, bucket, name = null) =>
  (
    await c.query(
      `select count(*)::int n from storage.objects
       where bucket_id = $1 and ($2::text is null or name = $2)`,
      [bucket, name],
    )
  ).rows[0].n;

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

test('cards bucket: public for CDN URL fetches, but NOT listable by clients (H8)', async () => {
  await withRollback(async (c) => {
    await setup(c);
    const card = 'reading-abc.png';
    await c.query(`insert into storage.objects (bucket_id, name) values ('cards', $1)`, [card]);

    // The bucket stays public: the CDN endpoint serves object URLs WITHOUT consulting RLS, which is
    // what the share sheet and invite-page's OG image rely on.
    assert.equal((await c.query(`select public from storage.buckets where id='cards'`)).rows[0].public, true, 'cards bucket is public');

    // ...but the broad `cards_public_read` SELECT policy (0003:31) let any client enumerate EVERY
    // published card of EVERY user. Advisors flagged it; migration 0023 drops it. Public buckets do
    // not need it for URL access, so this costs nothing and kills the enumeration.
    await asRole(c, { role: 'anon' });
    assert.equal(await countObjects(c, 'cards', card), 0, 'anon cannot list objects in the public bucket');
    await resetRole(c);
    await asRole(c, { uid: A });
    assert.equal(await countObjects(c, 'cards', card), 0, 'a signed-in stranger cannot list them either');
    await resetRole(c);
  });
});

test('card-drafts bucket: private, owner-readable only (H8)', async () => {
  await withRollback(async (c) => {
    await setup(c);
    // Pre-rendered cards land here and reach the CDN only on share intent, so a reading being
    // generated never publishes the user's palm + display name.
    assert.equal((await c.query(`select public from storage.buckets where id='card-drafts'`)).rows[0].public, false, 'card-drafts is private');

    await c.query(`insert into storage.objects (bucket_id, name) values ('card-drafts', $1)`, [`${A}/draft.png`]);

    await asRole(c, { uid: A });
    assert.equal(await countObjects(c, 'card-drafts', `${A}/draft.png`), 1, 'owner can preview their own draft');
    await resetRole(c);
    await asRole(c, { uid: B });
    assert.equal(await countObjects(c, 'card-drafts', `${A}/draft.png`), 0, "B cannot see A's unshared card");
    await resetRole(c);
    await asRole(c, { role: 'anon' });
    assert.equal(await countObjects(c, 'card-drafts', `${A}/draft.png`), 0, 'anon cannot see an unshared card');
    await resetRole(c);
  });
});
