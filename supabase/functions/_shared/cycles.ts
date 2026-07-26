// Line Cycles content (Audit-5 · 03 §4.2) — the words for a chapter `chapterFor` has already dated.
//
// Static, versioned, and ZERO model calls: a chapter is pure math over the reader's own geometry, so
// its prose can be a committed catalog rather than something generated nightly. That is what makes
// it impossible to ship a "half-generated" chapter — the failure mode the daily content has to
// guard against with `pulse_incomplete`. Bump the directory (`kb/cycles/v2/`) to change wording;
// never edit a shipped version in place (Backend §6.6.7 / §12, standing rule).
import catalog from '../../../kb/cycles/v1/chapters.json' with { type: 'json' };
import { CHAPTER_ARCHETYPES, PULSE_FEATURE_KEYS, type Chapter, type ChapterArchetype } from './pulse.ts';

export const CYCLES_VERSION: string = (catalog as { cycles_version: string }).cycles_version;

interface ArchetypeEntry {
  name: string;
  tease: string;
  body: string;
  features: Record<string, string>;
}
const ARCHETYPES = (catalog as unknown as { archetypes: Record<string, ArchetypeEntry> }).archetypes;

export interface ChapterCopy {
  /** Display name — the ONE part free readers see, next to the end date (01 §6). */
  name: string;
  /** One line a free reader may see as the tease. Never the body. */
  tease: string;
  /** The premium reading: the archetype's texture plus this feature's own line. */
  body: string;
}

/**
 * The words for a chapter. Total by construction — every (archetype × feature) pair resolves, and
 * `cycles.test.ts` proves all 120 of them do, so a caller never has to handle a missing chapter.
 */
export function chapterCopy(archetype: ChapterArchetype, featureKey: string): ChapterCopy {
  const entry = ARCHETYPES[archetype];
  if (!entry) throw new Error(`cycles: unknown archetype ${archetype}`);
  const line = entry.features[featureKey];
  if (!line) throw new Error(`cycles: ${archetype} has no line for ${featureKey}`);
  return { name: entry.name, tease: entry.tease, body: `${entry.body} ${line}` };
}

/** Convenience: a computed chapter plus its words, the shape both the sheet and the push want. */
export function describeChapter(chapter: Chapter, featureKey: string): Chapter & ChapterCopy {
  return { ...chapter, ...chapterCopy(chapter.archetype, featureKey) };
}

/** Every archetype id the catalog defines, for the completeness test. */
export const catalogArchetypes = (): string[] => Object.keys(ARCHETYPES);

/** Every string in the catalog — what the banned-claims audit scans. */
export function catalogStrings(): string[] {
  const out: string[] = [];
  for (const a of Object.values(ARCHETYPES)) {
    out.push(a.name, a.tease, a.body, ...Object.values(a.features));
  }
  return out;
}

/** Guard used by both the test and (cheaply) at generation time. */
export function missingChapterCopy(): string[] {
  const missing: string[] = [];
  for (const a of CHAPTER_ARCHETYPES) {
    for (const f of PULSE_FEATURE_KEYS) {
      try {
        const c = chapterCopy(a, f);
        if (!c.name || !c.body) missing.push(`${a}.${f}`);
      } catch {
        missing.push(`${a}.${f}`);
      }
    }
  }
  return missing;
}
