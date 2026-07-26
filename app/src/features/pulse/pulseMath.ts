/**
 * Today's Line — the deterministic math, CLIENT MIRROR of `supabase/functions/_shared/pulse.ts`
 * (Audit-5 · 03 §4).
 *
 * This file must behave identically to its server twin, function for function. That is not tidiness:
 * the 08:30 push is composed on the server and names a feature ("Your heart line has something to
 * say about Friday"), and the card the user opens seconds later computes the feature again, here,
 * with no round trip. If the two ever disagree, the push becomes a lie about the user's own hand.
 *
 * The guard is `pulse.vectors.json`, committed next to the server module and asserted by BOTH test
 * suites — the same discipline the pillar math uses (`_shared/pillar.ts` ↔ `fortune.ts`). Changing
 * either implementation without the other turns the vectors red.
 *
 * Pure and dependency-free: no clock, no storage, no network.
 */

/** The 15 feature lenses — exactly the section keys `palmSkeletons`/`faceSkeletons` emit. */
export const PULSE_PALM_KEYS = ['heart', 'head', 'life', 'fate', 'hand_shape', 'mounts', 'markings'] as const;
export const PULSE_FACE_KEYS = ['face_shape', 'proportion', 'eyes', 'eyebrows', 'nose', 'mouth', 'ears', 'canthus'] as const;
export const PULSE_FEATURE_KEYS: readonly string[] = [...PULSE_PALM_KEYS, ...PULSE_FACE_KEYS];

/** `subject_profiles.kind` values — what the user has actually had read. */
export type SubjectKind = 'palm_left' | 'palm_right' | 'face';

/** The pool a user draws from, derived from their subject kinds alone. Order is fixed. */
export function pulsePoolFor(kinds: readonly SubjectKind[]): string[] {
  const hasPalm = kinds.some((k) => k === 'palm_left' || k === 'palm_right');
  const hasFace = kinds.includes('face');
  const pool: string[] = [];
  if (hasPalm) pool.push(...PULSE_PALM_KEYS);
  if (hasFace) pool.push(...PULSE_FACE_KEYS);
  return pool;
}

/** FNV-1a (32-bit) — identical in Deno and Hermes: no crypto, no async, no platform digest. */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

// Dates as integers — every date question here is integer arithmetic on the UTC day number, so
// nothing can drift at a local midnight (the SH-14 class of bug).
const DAY_MS = 86_400_000;
const dayNumber = (dateKey: string): number => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(y, (m ?? 1) - 1, d ?? 1) / DAY_MS);
};
const keyOfDay = (n: number): string => new Date(n * DAY_MS).toISOString().slice(0, 10);

/** The fixed epoch every cycle and every chapter is measured from. */
export const PULSE_EPOCH = '2026-01-01';

/** `YYYY-MM-DD` → the same date shifted by `delta` days, timezone-free. */
export function shiftDateKey(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1) + delta * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Rotation, not a shuffle. Each cycle is one pool-length and gets its own deterministic shuffle, so
 * every feature appears exactly once per cycle; each cycle pre-commits its closing feature and the
 * next cycle may not open on it, so the same feature never lands two days running. See the server
 * twin for the full rationale and the precise guarantee.
 */
function cyclePermutation(userId: string, cycle: number, pool: readonly string[]): string[] {
  const n = pool.length;
  const perm = [...pool];
  for (let i = n - 1; i > 0; i--) {
    const j = fnv1a(`${userId}:c${cycle}:s${i}`) % (i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const endKey = pool[fnv1a(`${userId}:end:${cycle}`) % n];
  const at = perm.indexOf(endKey);
  [perm[at], perm[n - 1]] = [perm[n - 1], perm[at]];

  const prevEnd = pool[fnv1a(`${userId}:end:${cycle - 1}`) % n];
  if (n >= 3 && perm[0] === prevEnd) [perm[0], perm[1]] = [perm[1], perm[0]];
  return perm;
}

/** Which of the user's own features today reads. `null` when they have no canonical reading yet. */
export function pulseFeatureKey(userId: string, dateKey: string, kinds: readonly SubjectKind[]): string | null {
  const pool = pulsePoolFor(kinds);
  if (!pool.length) return null;
  if (pool.length === 1) return pool[0];

  const day = dayNumber(dateKey) - dayNumber(PULSE_EPOCH);
  const n = pool.length;
  const cycle = Math.floor(day / n);
  const offset = day - cycle * n;
  return cyclePermutation(userId, cycle, pool)[offset];
}

// ── Line Cycles ──────────────────────────────────────────────────────────────────────────────────

export const CHAPTER_MIN_DAYS = 21;
export const CHAPTER_MAX_DAYS = 45;

export const CHAPTER_ARCHETYPES = [
  'steady_water',
  'the_rebuild',
  'open_road',
  'quiet_forge',
  'long_light',
  'turning_soil',
  'held_breath',
  'clear_morning',
] as const;
export type ChapterArchetype = (typeof CHAPTER_ARCHETYPES)[number];

export interface Chapter {
  index: number;
  archetype: ChapterArchetype;
  starts_on: string;
  ends_on: string;
  /** The date IS the first day of this chapter — the boundary banner + boundary push day. */
  is_boundary: boolean;
}

/** The chapter a feature is in on a date, seeded by the reader's own `feature_hash`. */
export function chapterFor(featureKey: string, geometryHash: string, dateKey: string): Chapter {
  const seed = fnv1a(`${featureKey}:${geometryHash}`);
  const epoch = dayNumber(PULSE_EPOCH);
  const target = dayNumber(dateKey);

  const span = CHAPTER_MAX_DAYS - CHAPTER_MIN_DAYS + 1;
  let index = 0;
  let start = epoch;
  for (let guard = 0; guard < 4000; guard++) {
    const len = CHAPTER_MIN_DAYS + (fnv1a(`${seed}:${index}`) % span);
    if (target < start + len || guard === 3999) {
      return {
        index,
        archetype: CHAPTER_ARCHETYPES[fnv1a(`${seed}:arch:${index}`) % CHAPTER_ARCHETYPES.length],
        starts_on: keyOfDay(start),
        ends_on: keyOfDay(start + len - 1),
        is_boundary: target === start,
      };
    }
    start += len;
    index++;
  }
  throw new Error('chapterFor: unreachable');
}

/** Dates before the epoch clamp to chapter 0 — a guard for clock skew and `/dev` fixture dates. */
export function chapterForSafe(featureKey: string, geometryHash: string, dateKey: string): Chapter {
  return chapterFor(featureKey, geometryHash, dayNumber(dateKey) < dayNumber(PULSE_EPOCH) ? PULSE_EPOCH : dateKey);
}

// ── Presentation helpers (client-only — the server has no UI) ─────────────────────────────────────

/** The human name a feature goes by in copy. Mirrors `FEATURE_LABEL` in `_shared/pulse-generate.ts`
 *  so the push and the card call the same line the same thing. */
export const FEATURE_LABEL: Record<string, string> = {
  heart: 'heart line',
  head: 'head line',
  life: 'life line',
  fate: 'fate line',
  hand_shape: 'hand shape',
  mounts: 'mounts',
  markings: 'markings',
  face_shape: 'elemental face',
  proportion: 'proportions',
  eyes: 'eyes',
  eyebrows: 'brows',
  nose: 'nose',
  mouth: 'mouth',
  ears: 'ears',
  canthus: 'under-eye',
};

/** The palm line a feature lights on the diagram, or undefined for the non-line features. */
export const FEATURE_LINE: Record<string, string | undefined> = {
  heart: 'heart_line',
  head: 'head_line',
  life: 'life_line',
  fate: 'fate_line',
};

export const featureLabel = (key: string): string => FEATURE_LABEL[key] ?? key.replace(/_/g, ' ');

/** `TODAY · YOUR HEART LINE` — the card's eyebrow (02 §9). */
export const featureEyebrow = (key: string): string => `Today · your ${featureLabel(key)}`.toUpperCase();

/** "through Aug 14" — the chapter chip's date, in the reader's own locale. */
export function chapterEndLabel(endsOn: string, locale?: string): string {
  const [y, m, d] = endsOn.split('-').map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC', // the key is a plain calendar date; letting it drift a day would be a wrong date
  });
}
