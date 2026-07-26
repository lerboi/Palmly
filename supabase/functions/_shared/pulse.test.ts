import { assert, assertEquals, assertNotEquals } from '@std/assert';
import {
  CHAPTER_ARCHETYPES,
  CHAPTER_MAX_DAYS,
  CHAPTER_MIN_DAYS,
  chapterFor,
  chapterForSafe,
  fnv1a,
  PULSE_FACE_KEYS,
  PULSE_FEATURE_KEYS,
  PULSE_PALM_KEYS,
  pulseFeatureKey,
  pulsePoolFor,
  shiftDateKey,
  type SubjectKind,
} from './pulse.ts';
import vectors from './pulse.vectors.json' with { type: 'json' };

/**
 * RF1.T2 — the pulse math (03 §4). Two kinds of assertion here, and both matter:
 *   • the committed VECTORS, which the client mirror asserts against too. These are what stop the
 *     server's push and the client's card from ever naming different features.
 *   • the PROPERTIES (determinism, pool composition, rotation, chapter bounds), which say what the
 *     algorithm is allowed to be if it is ever rewritten.
 */

// ── Vectors: the client mirror asserts against this same file ────────────────────────────────────

Deno.test('vectors: fnv1a reproduces every committed hash', () => {
  for (const v of vectors.fnv1a) assertEquals(fnv1a(v.input), v.hash, `fnv1a(${JSON.stringify(v.input)})`);
});

Deno.test('vectors: the empty string is the FNV-1a offset basis (a known-answer anchor)', () => {
  assertEquals(fnv1a(''), 0x811c9dc5);
});

Deno.test('vectors: pools reproduce', () => {
  for (const v of vectors.pools) assertEquals(pulsePoolFor(v.kinds as SubjectKind[]), v.pool);
});

Deno.test('vectors: every committed (user, date, kinds) → feature still holds', () => {
  for (const v of vectors.selection) {
    assertEquals(pulseFeatureKey(v.userId, v.dateKey, v.kinds as SubjectKind[]), v.feature, `${v.userId} ${v.dateKey} ${v.kinds.join('+')}`);
  }
});

Deno.test('vectors: every committed chapter still holds', () => {
  for (const v of vectors.chapters) {
    assertEquals(chapterFor(v.featureKey, v.geometryHash, v.dateKey), v.chapter, `${v.featureKey} ${v.dateKey}`);
  }
});

// ── Keys ─────────────────────────────────────────────────────────────────────────────────────────

Deno.test('PULSE_FEATURE_KEYS: 7 palm + 8 face, all distinct', () => {
  assertEquals(PULSE_PALM_KEYS.length, 7);
  assertEquals(PULSE_FACE_KEYS.length, 8);
  assertEquals(PULSE_FEATURE_KEYS.length, 15);
  assertEquals(new Set(PULSE_FEATURE_KEYS).size, 15);
});

// ── Selection ────────────────────────────────────────────────────────────────────────────────────

Deno.test('pulseFeatureKey: deterministic — same inputs, same feature, every time', () => {
  const u = 'user-abc';
  for (let i = 0; i < 50; i++) {
    assertEquals(pulseFeatureKey(u, '2026-07-26', ['palm_left']), pulseFeatureKey(u, '2026-07-26', ['palm_left']));
  }
});

Deno.test('pulseFeatureKey: the pool follows the subject kinds, and only those', () => {
  const palm = pulseFeatureKey('u', '2026-07-26', ['palm_left']);
  assert(PULSE_PALM_KEYS.includes(palm as (typeof PULSE_PALM_KEYS)[number]), `${palm} must be a palm key`);

  const face = pulseFeatureKey('u', '2026-07-26', ['face']);
  assert(PULSE_FACE_KEYS.includes(face as (typeof PULSE_FACE_KEYS)[number]), `${face} must be a face key`);

  // Both kinds → the union, and over a month it really does draw from both halves.
  const seen = new Set<string>();
  for (let d = 1; d <= 31; d++) seen.add(pulseFeatureKey('u', `2026-07-${String(d).padStart(2, '0')}`, ['palm_left', 'face'])!);
  assert([...seen].some((k) => (PULSE_PALM_KEYS as readonly string[]).includes(k)), 'draws palm keys');
  assert([...seen].some((k) => (PULSE_FACE_KEYS as readonly string[]).includes(k)), 'draws face keys');
});

Deno.test('pulseFeatureKey: two palms are still one palm pool (left+right ≠ 14 keys)', () => {
  assertEquals(pulsePoolFor(['palm_left', 'palm_right']), [...PULSE_PALM_KEYS]);
});

Deno.test('pulseFeatureKey: no canonical reading → null (first-run users have no line of the day)', () => {
  assertEquals(pulseFeatureKey('u', '2026-07-26', []), null);
  assertEquals(pulsePoolFor([]), []);
});

Deno.test('pulseFeatureKey: different users get different features on the same day', () => {
  const day = '2026-07-26';
  const spread = new Set(Array.from({ length: 40 }, (_, i) => pulseFeatureKey(`user-${i}`, day, ['palm_left'])));
  assert(spread.size >= 4, `expected a spread across the pool, got ${[...spread].join(',')}`);
});

Deno.test('pulseFeatureKey: never the same feature two days running — over two years, every pool', () => {
  // The anti-"I have seen this before" mechanic (01 §9). Two years covers ~100 cycle seams per user,
  // which is exactly where the earlier hash-with-lookback design broke.
  const pools: SubjectKind[][] = [['palm_left'], ['face'], ['palm_left', 'face']];
  for (const kinds of pools) {
    for (const user of ['a', 'b', 'c', 'd', 'e']) {
      let prev: string | null = null;
      for (let i = 0; i < 730; i++) {
        const key = pulseFeatureKey(user, shiftDateKey('2026-01-01', i), kinds);
        assertNotEquals(key, prev, `${user}/${kinds.join('+')} repeated ${key} on consecutive days`);
        prev = key;
      }
    }
  }
});

Deno.test('pulseFeatureKey: each cycle shows every feature exactly once (a rotation, not a shuffle)', () => {
  const cases: { kinds: SubjectKind[]; size: number }[] = [
    { kinds: ['palm_left'], size: 7 },
    { kinds: ['face'], size: 8 },
    { kinds: ['palm_left', 'face'], size: 15 },
  ];
  for (const { kinds, size } of cases) {
    for (const user of ['a', 'b']) {
      for (let cycle = 0; cycle < 6; cycle++) {
        const run = Array.from({ length: size }, (_, i) => pulseFeatureKey(user, shiftDateKey('2026-01-01', cycle * size + i), kinds));
        assertEquals(new Set(run).size, size, `${user} cycle ${cycle} (${kinds.join('+')}) repeated inside one cycle: ${run.join(',')}`);
      }
    }
  }
});

Deno.test('pulseFeatureKey: no feature goes unseen for two cycles (full coverage, no stale lens)', () => {
  const kinds: SubjectKind[] = ['palm_left'];
  for (const user of ['a', 'b', 'c']) {
    const lastSeen = new Map<string, number>();
    for (let i = 0; i < 365; i++) {
      const key = pulseFeatureKey(user, shiftDateKey('2026-01-01', i), kinds)!;
      lastSeen.set(key, i);
    }
    for (const [key, day] of lastSeen) assert(day >= 365 - 14, `${user}: ${key} unseen for the last two cycles`);
    assertEquals(lastSeen.size, PULSE_PALM_KEYS.length, 'every palm feature was used');
  }
});

Deno.test('pulseFeatureKey: dates before the epoch still rotate cleanly (negative cycles)', () => {
  let prev: string | null = null;
  for (let i = -400; i <= 0; i++) {
    const key = pulseFeatureKey('back-in-time', shiftDateKey('2026-01-01', i), ['palm_left']);
    assert(key !== null);
    assertNotEquals(key, prev, `repeat at offset ${i}`);
    prev = key;
  }
});

Deno.test('shiftDateKey: walks days across month and year boundaries', () => {
  assertEquals(shiftDateKey('2026-03-01', -1), '2026-02-28');
  assertEquals(shiftDateKey('2026-01-01', -1), '2025-12-31');
  assertEquals(shiftDateKey('2026-12-31', 1), '2027-01-01');
  assertEquals(shiftDateKey('2028-02-28', 1), '2028-02-29'); // leap
});

// ── Chapters ─────────────────────────────────────────────────────────────────────────────────────

Deno.test('chapterFor: the date always falls inside the chapter it returns', () => {
  for (const f of PULSE_FEATURE_KEYS) {
    for (let d = 1; d <= 28; d++) {
      const dateKey = `2026-08-${String(d).padStart(2, '0')}`;
      const c = chapterFor(f, 'hash-1', dateKey);
      assert(c.starts_on <= dateKey && dateKey <= c.ends_on, `${f} ${dateKey} outside ${c.starts_on}..${c.ends_on}`);
    }
  }
});

Deno.test('chapterFor: chapters tile the calendar with no gap and no overlap', () => {
  let cursor = '2026-01-01';
  let prevIndex = -1;
  for (let i = 0; i < 20; i++) {
    const c = chapterFor('fate', 'hash-2', cursor);
    assertEquals(c.starts_on, cursor, 'each chapter starts the day after the last one ended');
    assertEquals(c.index, prevIndex + 1, 'indices are contiguous');
    assert(c.is_boundary, 'walking onto a start date is a boundary day');
    prevIndex = c.index;
    // The day after this chapter ends is the next chapter's first day.
    cursor = shiftDateKey(c.ends_on, 1);
  }
});

Deno.test('chapterFor: every chapter length sits inside 21–45 days', () => {
  for (const f of ['heart', 'fate', 'eyes']) {
    let cursor = '2026-01-01';
    for (let i = 0; i < 15; i++) {
      const c = chapterFor(f, 'hash-3', cursor);
      const len = (Date.parse(c.ends_on) - Date.parse(c.starts_on)) / 86_400_000 + 1;
      assert(len >= CHAPTER_MIN_DAYS && len <= CHAPTER_MAX_DAYS, `${f} chapter ${c.index} ran ${len} days`);
      cursor = shiftDateKey(c.ends_on, 1);
    }
  }
});

Deno.test('chapterFor: is_boundary is true on exactly one day per chapter', () => {
  const c = chapterFor('heart', 'hash-4', '2026-05-05');
  assert(chapterFor('heart', 'hash-4', c.starts_on).is_boundary);
  assert(!chapterFor('heart', 'hash-4', shiftDateKey(c.starts_on, 1)).is_boundary);
  assert(!chapterFor('heart', 'hash-4', c.ends_on).is_boundary);
  assert(chapterFor('heart', 'hash-4', shiftDateKey(c.ends_on, 1)).is_boundary, 'the next chapter opens');
});

Deno.test('chapterFor: two users with different geometry are on different schedules', () => {
  const a = chapterFor('fate', 'geometry-a', '2026-07-26');
  const b = chapterFor('fate', 'geometry-b', '2026-07-26');
  assert(a.starts_on !== b.starts_on || a.archetype !== b.archetype, 'personal cycles must not synchronize');
});

Deno.test('chapterFor: one user’s features turn pages independently', () => {
  const heart = chapterFor('heart', 'same-hash', '2026-07-26');
  const fate = chapterFor('fate', 'same-hash', '2026-07-26');
  assert(heart.starts_on !== fate.starts_on || heart.archetype !== fate.archetype);
});

Deno.test('chapterFor: archetypes are drawn from the catalog and all eight are reachable', () => {
  const seen = new Set<string>();
  for (const f of PULSE_FEATURE_KEYS) {
    for (const h of ['h1', 'h2', 'h3', 'h4']) {
      let cursor = '2026-01-01';
      for (let i = 0; i < 8; i++) {
        const c = chapterFor(f, h, cursor);
        assert((CHAPTER_ARCHETYPES as readonly string[]).includes(c.archetype));
        seen.add(c.archetype);
        cursor = shiftDateKey(c.ends_on, 1);
      }
    }
  }
  assertEquals(seen.size, CHAPTER_ARCHETYPES.length, 'every archetype is reachable');
});

Deno.test('chapterForSafe: a pre-epoch date clamps to chapter 0 instead of running backwards', () => {
  const c = chapterForSafe('heart', 'hash-5', '2019-04-01');
  assertEquals(c.index, 0);
  assertEquals(c.starts_on, '2026-01-01');
});
