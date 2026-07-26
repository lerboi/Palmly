import { CHAPTER_CATALOG, CYCLES_VERSION } from './chapters.generated';
import type { Chapter, ChapterArchetype } from './pulseMath';

/**
 * Line Cycles copy, client side (Audit-5 · 03 §4.2).
 *
 * The words come from `kb/cycles/v1/chapters.json` — the same committed catalog the Edge Functions
 * import — via the generated sibling `chapters.generated.ts` (Metro cannot resolve modules outside
 * `app/`; see `kb/build-cycles.mjs`). One source, two bundlers, and a `--check` mode that fails if
 * the copy goes stale.
 *
 * It is static content with no model call anywhere in its path, which is what makes a chapter
 * impossible to ship half-generated: either the app has the catalog or it does not build.
 *
 * Free readers see `name` + the end date; that is the tease, and the date is the hook (01 §6).
 * Premium gets `body`.
 */

const ARCHETYPES = CHAPTER_CATALOG;

export { CYCLES_VERSION };

export interface ChapterCopy {
  name: string;
  tease: string;
  body: string;
}

/**
 * The words for a chapter, or `null` if the catalog somehow lacks them.
 *
 * Null rather than a thrown error or an empty string: the card's job is to keep working. A missing
 * chapter hides the chip; it must never render "· through Aug 14" with a blank name beside it, and
 * it must certainly never take down the reading the chip sits under.
 */
export function chapterCopy(archetype: ChapterArchetype, featureKey: string): ChapterCopy | null {
  const entry = ARCHETYPES[archetype];
  const line = entry?.features?.[featureKey];
  if (!entry || !line) return null;
  return { name: entry.name, tease: entry.tease, body: `${entry.body} ${line}` };
}

/** A computed chapter plus its words — what the chip and the sheet both render from. */
export type DescribedChapter = Chapter & ChapterCopy;

export function describeChapter(chapter: Chapter | null, featureKey: string | null): DescribedChapter | null {
  if (!chapter || !featureKey) return null;
  const copy = chapterCopy(chapter.archetype, featureKey);
  return copy ? { ...chapter, ...copy } : null;
}
