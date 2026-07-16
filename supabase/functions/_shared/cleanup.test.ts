import { assertEquals, assertRejects } from '@std/assert';
import { countPaths, groupPathsByBucket, mergedStoragePath, purgeAccountStorageFirst, StoragePurgeError } from './cleanup.ts';

Deno.test('groupPathsByBucket: groups per bucket, drops empties, de-dupes', () => {
  const grouped = groupPathsByBucket([
    { bucket: 'scans', path: 'u1/a.jpg' },
    { bucket: 'scans', path: 'u1/b.jpg' },
    { bucket: 'scans', path: 'u1/a.jpg' }, // dup
    { bucket: 'cards', path: 'u1/card.png' },
    { bucket: 'scans', path: '' }, // empty path dropped
    { bucket: '', path: 'x' }, // empty bucket dropped
  ]);
  assertEquals(grouped.scans.sort(), ['u1/a.jpg', 'u1/b.jpg']);
  assertEquals(grouped.cards, ['u1/card.png']);
  assertEquals(countPaths(grouped), 3);
});

Deno.test('groupPathsByBucket: empty input → empty object', () => {
  assertEquals(groupPathsByBucket([]), {});
  assertEquals(countPaths({}), 0);
});

// ── H7: storage/DB ordering ──────────────────────────────────────────────────────────────────────

Deno.test('mergedStoragePath: re-homes an owner-prefixed path, leaves others alone', () => {
  const loser = 'aaaa-1', survivor = 'bbbb-2';
  assertEquals(mergedStoragePath('aaaa-1/scan.jpg', loser, survivor), 'bbbb-2/scan.jpg');
  assertEquals(mergedStoragePath('aaaa-1/nested/card.png', loser, survivor), 'bbbb-2/nested/card.png');
  // not under the loser's prefix → never rewritten
  assertEquals(mergedStoragePath('cccc-3/other.jpg', loser, survivor), 'cccc-3/other.jpg');
  // a bare id-lookalike without the separator must not be touched
  assertEquals(mergedStoragePath('aaaa-11/x.jpg', loser, survivor), 'aaaa-11/x.jpg');
});

Deno.test('purgeAccountStorageFirst: happy path deletes objects BEFORE rows, logs completion last', async () => {
  const calls: string[] = [];
  const r = await purgeAccountStorageFirst({
    collectPaths: () => {
      calls.push('collect');
      return Promise.resolve([
        { bucket: 'scans', path: 'u1/a.jpg' },
        { bucket: 'cards', path: 'u1/c.png' },
      ]);
    },
    removeObjects: (bucket) => {
      calls.push(`remove:${bucket}`);
      return Promise.resolve({ error: null });
    },
    purgeRows: () => {
      calls.push('purge');
      return Promise.resolve({ error: null });
    },
    markComplete: () => {
      calls.push('complete');
      return Promise.resolve();
    },
  });
  assertEquals(r, { removed: 2, total: 2 });
  // the ORDER is the contract: every removal precedes the purge, and completion is stamped last
  assertEquals(calls, ['collect', 'remove:scans', 'remove:cards', 'purge', 'complete']);
});

Deno.test('purgeAccountStorageFirst: a storage failure NEVER purges the rows (no orphaned crops)', async () => {
  // THE H7 regression test. Old behaviour: purge_account ran first and the removal was
  // "best-effort", so this exact scenario left palm/face crops in the bucket with zero DB reference
  // (the cleanup sweep reads `scans`, now deleted) and still returned 200 {deleted:true}.
  let purged = false;
  let completed = false;
  await assertRejects(
    () =>
      purgeAccountStorageFirst({
        collectPaths: () => Promise.resolve([{ bucket: 'scans', path: 'u1/a.jpg' }]),
        removeObjects: () => Promise.resolve({ error: new Error('S3 unavailable') }),
        purgeRows: () => {
          purged = true;
          return Promise.resolve({ error: null });
        },
        markComplete: () => {
          completed = true;
          return Promise.resolve();
        },
      }),
    StoragePurgeError,
  );
  assertEquals(purged, false, 'rows must survive a storage failure — they are the only handle on the blob');
  assertEquals(completed, false, 'the D2 audit must not claim completion');
});

Deno.test('purgeAccountStorageFirst: a row-purge failure does not stamp completion', async () => {
  let completed = false;
  await assertRejects(
    () =>
      purgeAccountStorageFirst({
        collectPaths: () => Promise.resolve([{ bucket: 'scans', path: 'u1/a.jpg' }]),
        removeObjects: () => Promise.resolve({ error: null }),
        purgeRows: () => Promise.resolve({ error: new Error('deadlock') }),
        markComplete: () => {
          completed = true;
          return Promise.resolve();
        },
      }),
    StoragePurgeError,
  );
  assertEquals(completed, false, 'completed_at is stamped only when the erasure actually finished');
});
