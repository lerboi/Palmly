import { assertEquals } from '@std/assert';
import { countPaths, groupPathsByBucket } from './cleanup.ts';

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
