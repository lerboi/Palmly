import { assert, assertEquals } from '@std/assert';
import { branchAnimal, dayPillar, dayPillarEn, elementProfile, GENERIC_BUCKET, pillarBucket } from './pillar.ts';

Deno.test('dayPillar: anchor 2000-01-07 is 甲子 (jiazi, yang wood)', () => {
  const p = dayPillar('2000-01-07');
  assert(p);
  if (p) {
    assertEquals(p.index, 0);
    assertEquals(p.day_pillar, '甲子');
    assertEquals(p.bucket, 'jiazi');
    assertEquals(p.element, 'wood');
    assertEquals(p.yin_yang, 'yang');
  }
});

Deno.test('dayPillar: the cycle steps by one per day and wraps at 60', () => {
  assertEquals(dayPillar('2000-01-08')?.bucket, 'yichou'); // 乙丑, index 1
  assertEquals(dayPillar('2000-01-01')?.bucket, 'wuwu'); //   戊午, index 54 (6 days before the anchor)
  assertEquals(dayPillar('2000-01-06')?.index, 59); //        癸亥, the last of the cycle
});

Deno.test('pillarBucket: same day-pillar recurs exactly every 60 days', () => {
  assertEquals(pillarBucket('2000-01-07'), pillarBucket('2000-03-07')); // +60 days → same bucket
  assert(pillarBucket('2000-01-07') !== pillarBucket('2000-01-08'));
});

Deno.test('pillarBucket: element cycles through all five over the stems', () => {
  const elems = new Set<string>();
  for (let d = 7; d <= 16; d++) elems.add(dayPillar(`2000-01-${String(d).padStart(2, '0')}`)!.element);
  assertEquals([...elems].sort(), ['earth', 'fire', 'metal', 'water', 'wood']);
});

Deno.test('missing / invalid birth date → the generic bucket (fortunes still render)', () => {
  assertEquals(pillarBucket(null), GENERIC_BUCKET);
  assertEquals(pillarBucket(undefined), GENERIC_BUCKET);
  assertEquals(pillarBucket(''), GENERIC_BUCKET);
  assertEquals(pillarBucket('not-a-date'), GENERIC_BUCKET);
  assertEquals(pillarBucket('2000-13-40'), GENERIC_BUCKET);
  assertEquals(elementProfile(null), { bucket: GENERIC_BUCKET });
});

Deno.test('elementProfile: full jsonb for a valid date', () => {
  assertEquals(elementProfile('2000-01-07'), { day_master: '甲', element: 'wood', yin_yang: 'yang', day_pillar: '甲子', day_pillar_index: 0, bucket: 'jiazi' });
});

Deno.test('there are exactly 60 distinct buckets across the cycle', () => {
  const buckets = new Set<string>();
  for (let i = 0; i < 60; i++) buckets.add(dayPillar(`2000-01-07`)!.bucket); // sanity: stable
  for (let d = 0; d < 60; d++) {
    const jdnDate = new Date(Date.UTC(2000, 0, 7 + d)); // walk 60 consecutive days
    const iso = jdnDate.toISOString().slice(0, 10);
    buckets.add(pillarBucket(iso));
  }
  assertEquals(buckets.size, 60, 'the 60-day cycle yields 60 unique buckets');
});

// ── RF1.T4: the English whisper, server-side ─────────────────────────────────────────────────────
Deno.test('dayPillarEn: matches the client romanization the header already shows', () => {
  // Anchor: 2000-01-07 is 甲子 — yang wood, branch Rat.
  assertEquals(dayPillarEn('2000-01-07'), 'Wood Rat');
  assertEquals(dayPillarEn('2000-01-08'), 'Wood Ox');
  assertEquals(dayPillarEn('2000-01-12'), 'Earth Snake');
  assertEquals(dayPillarEn(null), null);
  assertEquals(dayPillarEn('not-a-date'), null);
});

Deno.test('branchAnimal: all twelve, and it wraps rather than returning undefined', () => {
  assertEquals(branchAnimal(0), 'Rat');
  assertEquals(branchAnimal(11), 'Pig');
  assertEquals(branchAnimal(12), 'Rat');
  assertEquals(branchAnimal(59), 'Pig');
  assertEquals(new Set(Array.from({ length: 12 }, (_, i) => branchAnimal(i))).size, 12);
});
