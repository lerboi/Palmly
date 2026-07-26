import { assert, assertEquals } from '@std/assert';
import { bannedHits } from './narrative.ts';
import { CHAPTER_ARCHETYPES, PULSE_FEATURE_KEYS, chapterFor } from './pulse.ts';
import { catalogArchetypes, catalogStrings, chapterCopy, CYCLES_VERSION, describeChapter, missingChapterCopy } from './cycles.ts';

/**
 * RF1.T3 — the Line Cycles catalog. It is static content, so its whole risk surface is coverage and
 * copy: a missing (archetype × feature) pair would put an empty chapter on a paying user's card,
 * and a stray claim would put a health/finance promise in front of them. Both are tested, not hoped.
 */

Deno.test('cycles: the catalog is versioned', () => {
  assertEquals(CYCLES_VERSION, 'cycles.v1');
});

Deno.test('cycles: every archetype the math can produce exists in the catalog', () => {
  assertEquals(catalogArchetypes().sort(), [...CHAPTER_ARCHETYPES].sort());
});

Deno.test('cycles: all 8 × 15 = 120 (archetype, feature) pairs resolve a name and a reading', () => {
  assertEquals(missingChapterCopy(), []);
  assertEquals(CHAPTER_ARCHETYPES.length * PULSE_FEATURE_KEYS.length, 120);
});

Deno.test('cycles: every resolved reading is distinct — no two features share a chapter body', () => {
  const bodies = new Set<string>();
  for (const a of CHAPTER_ARCHETYPES) for (const f of PULSE_FEATURE_KEYS) bodies.add(chapterCopy(a, f).body);
  assertEquals(bodies.size, 120, 'a duplicated body would read as recycled content (01 §9)');
});

Deno.test('cycles: no banned claims anywhere in the catalog (Backend §13)', () => {
  const hits = catalogStrings().flatMap((s) => bannedHits(s).map((h) => `${h} in "${s.slice(0, 60)}…"`));
  assertEquals(hits, []);
});

Deno.test('cycles: no CJK in the reader-facing copy (English-first UI)', () => {
  // 卧蚕 appears in the PROMPT (naming a tradition concept for the model) but must never reach a card.
  const cjk = catalogStrings().filter((s) => /[㐀-鿿]/.test(s));
  assertEquals(cjk, []);
});

Deno.test('cycles: names are short enough for the chip, teases short enough for one line', () => {
  for (const a of CHAPTER_ARCHETYPES) {
    const c = chapterCopy(a, 'heart');
    assert(c.name.length <= 24, `${a} name too long for the ChapterChip: "${c.name}"`);
    assert(c.tease.length <= 72, `${a} tease too long for one line: "${c.tease}"`);
  }
});

Deno.test('describeChapter: merges the computed dates with the catalog words', () => {
  const chapter = chapterFor('fate', 'geometry-hash', '2026-07-26');
  const described = describeChapter(chapter, 'fate');
  assertEquals(described.starts_on, chapter.starts_on);
  assertEquals(described.ends_on, chapter.ends_on);
  assertEquals(described.archetype, chapter.archetype);
  assert(described.name.length > 0);
  assert(described.body.includes('fate line') || described.body.length > 40, 'the feature line rode along');
});

Deno.test('chapterCopy: an unknown archetype or feature throws rather than rendering blank', () => {
  let threw = 0;
  try {
    chapterCopy('not_an_archetype' as never, 'heart');
  } catch {
    threw++;
  }
  try {
    chapterCopy('steady_water', 'not_a_feature');
  } catch {
    threw++;
  }
  assertEquals(threw, 2, 'silent empty copy is worse than a loud failure');
});
