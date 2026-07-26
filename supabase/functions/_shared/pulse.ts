// Today's Line — the deterministic math (Audit-5 · 03 §4). Pure, dependency-free, and mirrored
// byte-for-byte by `app/src/features/pulse/pulseMath.ts`. The mirror is not a style choice: the
// morning push (server) names a feature and the card (client) must reveal THAT feature, computed
// independently, with no round trip. If the two ever disagree the push becomes a lie, so the two
// implementations share a committed vector file (`pulse.vectors.json`) that both test suites assert
// against — the same discipline the pillar math already uses (`pillar.ts` ↔ `fortune.ts`).
//
// Nothing here talks to the network, the clock, or the database. Feed it a user id and a date key.

/**
 * The 15 feature lenses. These are exactly the section keys `palmSkeletons` / `faceSkeletons`
 * (narrative.ts) emit, so a feature chosen for today always names a section the reading really has.
 * The pulse_templates CHECK constraint carries the same list; `PULSE_FEATURE_KEYS` is the source
 * both generation and the fan-out read, and `assertPulseKeys` proves the two never drift.
 */
export const PULSE_PALM_KEYS = ['heart', 'head', 'life', 'fate', 'hand_shape', 'mounts', 'markings'] as const;
export const PULSE_FACE_KEYS = ['face_shape', 'proportion', 'eyes', 'eyebrows', 'nose', 'mouth', 'ears', 'canthus'] as const;
export const PULSE_FEATURE_KEYS: readonly string[] = [...PULSE_PALM_KEYS, ...PULSE_FACE_KEYS];

/** `subject_profiles.kind` values — what the user has actually had read. */
export type SubjectKind = 'palm_left' | 'palm_right' | 'face';

/**
 * The pool a user draws from, derived from their subject kinds ALONE.
 *
 * Deliberately not derived from the stored narrative: the fan-out would then have to read every
 * user's reading JSON to compose one push, and the client would have to agree with whatever the
 * server happened to parse. `subject_profiles.kind` is one small indexed column both sides can read
 * identically. Order is fixed (palm before face, declaration order within each) so the hash lands
 * on the same key on both sides.
 */
export function pulsePoolFor(kinds: readonly SubjectKind[]): string[] {
  const hasPalm = kinds.some((k) => k === 'palm_left' || k === 'palm_right');
  const hasFace = kinds.includes('face');
  const pool: string[] = [];
  if (hasPalm) pool.push(...PULSE_PALM_KEYS);
  if (hasFace) pool.push(...PULSE_FACE_KEYS);
  return pool;
}

/**
 * FNV-1a (32-bit), the standard non-cryptographic hash. Chosen over anything from `crypto` because
 * it is trivially identical in Deno and in Hermes with no async, no subtle-crypto, and no
 * platform-dependent digest — properties that matter more here than avalanche quality. Nothing
 * secret is being derived: this only has to be STABLE and evenly spread.
 */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    // ×16777619 in 32-bit, via shifts, so the result never leaves the safe-integer range.
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

// ── Dates as integers ────────────────────────────────────────────────────────────────────────────
// Every date question here (which block, which chapter, how many days) is integer arithmetic on the
// UTC day number. Doing it in Date objects invites exactly the local-midnight drift that SH-14 was.
const DAY_MS = 86_400_000;
const dayNumber = (dateKey: string): number => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(y, (m ?? 1) - 1, d ?? 1) / DAY_MS);
};
const keyOfDay = (n: number): string => new Date(n * DAY_MS).toISOString().slice(0, 10);

/** The fixed epoch every cycle and every chapter is measured from. */
export const PULSE_EPOCH = '2026-01-01';

/** `YYYY-MM-DD` → the same date shifted by `delta` days, without touching the local timezone. */
export function shiftDateKey(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const t = Date.UTC(y, (m ?? 1) - 1, d ?? 1) + delta * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Rotation, not a shuffle (03 §4.1).
 *
 * The spec asks for a "no-repeat window of ~5 days" over a hashed draw. A hashed draw with a
 * look-back window turns out not to deliver it: the window has to exclude what the user ACTUALLY
 * saw, "what they actually saw" is defined recursively, and any bounded approximation leaves a seam
 * where a feature repeats on consecutive days — the precise thing the mechanic exists to prevent
 * (01 §9: visible repetition is the category's known killer).
 *
 * So the day's feature comes from a **per-cycle permutation** instead. Each cycle is one pool-length
 * (7 palm-only / 8 face-only / 15 both) and gets its own deterministic shuffle of the whole pool.
 * It is O(pool), with no walk, no stored history, and no recursion.
 *
 * Cycle seams are handled by construction rather than by luck: each cycle pre-commits to which
 * feature ENDS it, and the next cycle's shuffle is forbidden to start with the previous cycle's
 * ending feature. Both facts depend only on (userId, cycle) and (userId, cycle−1) — nothing to
 * unroll.
 *
 * **Exactly what this guarantees** (stated precisely, because a vaguer claim would be a nicer
 * sentence and a worse one — Decision Log 2026-07-26):
 *   • every feature appears exactly ONCE per cycle → nothing goes unseen for two cycles, which a
 *     hashed draw cannot promise at all;
 *   • the same feature NEVER lands on consecutive days, at any seam, for any pool;
 *   • across a seam two occurrences can sit as close as 2 days apart (a cycle's closer, then the
 *     next cycle's second slot). A literal 5-day window is arithmetically impossible alongside full
 *     rotation on a 7-key pool — forbidding 5 of 7 features from 5 consecutive slots has no
 *     solution — so this is the honest maximum, not a shortcut.
 */
function cyclePermutation(userId: string, cycle: number, pool: readonly string[]): string[] {
  const n = pool.length;
  // Fisher–Yates driven by successive FNV hashes — a stable PRNG with no platform dependency.
  const perm = [...pool];
  for (let i = n - 1; i > 0; i--) {
    const j = fnv1a(`${userId}:c${cycle}:s${i}`) % (i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  // The pre-committed closer for this cycle, moved into last place.
  const endKey = pool[fnv1a(`${userId}:end:${cycle}`) % n];
  const at = perm.indexOf(endKey);
  [perm[at], perm[n - 1]] = [perm[n - 1], perm[at]];

  // ...and never open on the feature that closed the previous cycle. Swapping with position 1 is
  // safe because the pool has no duplicates, and (n ≥ 3 always here) it cannot disturb the closer.
  const prevEnd = pool[fnv1a(`${userId}:end:${cycle - 1}`) % n];
  if (n >= 3 && perm[0] === prevEnd) [perm[0], perm[1]] = [perm[1], perm[0]];
  return perm;
}

/**
 * Which of the user's own features today reads (03 §4.1).
 *
 * Deterministic in (userId, dateKey, kinds) — no storage, no clock, no round trip — so the 08:30
 * push and the card the user opens at 08:31 name the same line.
 *
 * A user with no canonical reading has no pool and gets `null`: the caller shows first-run, and the
 * fan-out skips them rather than pushing about a line that does not exist yet.
 */
export function pulseFeatureKey(userId: string, dateKey: string, kinds: readonly SubjectKind[]): string | null {
  const pool = pulsePoolFor(kinds);
  if (!pool.length) return null;
  if (pool.length === 1) return pool[0];

  const day = dayNumber(dateKey) - dayNumber(PULSE_EPOCH);
  const n = pool.length;
  // Math.floor, not truncation: cycles must tile correctly for dates before the epoch too, and
  // `-1 / 7 | 0` would fold two different days onto cycle 0.
  const cycle = Math.floor(day / n);
  const offset = day - cycle * n; // always 0..n-1
  return cyclePermutation(userId, cycle, pool)[offset];
}

// ── Line Cycles (03 §4.2) ────────────────────────────────────────────────────────────────────────
// A dated chapter per feature. Pure code, ZERO model calls: the chapter a user is in is a function
// of (feature, their geometry, the date), so it is free to compute, identical on both sides, and
// impossible to get "half generated". Free users see the chapter's NAME and END DATE (the tease is
// the date); premium gets the reading. Chapter turns are the conversion spike the category proves
// (01 §7 T2) — made personal, because these boundaries are the user's own, not the moon's.

export const CHAPTER_MIN_DAYS = 21;
export const CHAPTER_MAX_DAYS = 45;

/**
 * The chapter archetypes. Eight names, deliberately plain and non-predictive — a chapter describes a
 * TEXTURE the tradition would read into a period, never an event that will happen (01 §5's honesty
 * line). `kb/cycles/v1/` holds the per-feature readings keyed on these ids.
 */
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
  /** Which chapter of this feature's life the date falls in — monotonic, never reset. */
  index: number;
  archetype: ChapterArchetype;
  starts_on: string;
  ends_on: string;
  /** The date IS the first day of this chapter — the banner + boundary push day. */
  is_boundary: boolean;
}

/**
 * The chapter a feature is in on a date (03 §4.2).
 *
 * Seeded by (featureKey, geometryHash) — the user's own `feature_sets.feature_hash` — so two people
 * are never on the same schedule, and one person's fate line and heart line turn pages independently
 * (which is the point: something is always about to change, and none of it is a global "mercury
 * retrograde" everyone gets at once). Chapter LENGTHS vary per chapter within 21–45 days, so the
 * rhythm never becomes a visible metronome, and the walk is a bounded loop from a fixed epoch rather
 * than a modulo — irregular lengths have no closed form.
 */
export function chapterFor(featureKey: string, geometryHash: string, dateKey: string): Chapter {
  const seed = fnv1a(`${featureKey}:${geometryHash}`);
  // A fixed epoch, so a chapter's boundaries are the same whenever they are computed. 2026-01-01.
  const epoch = dayNumber(PULSE_EPOCH);
  const target = dayNumber(dateKey);

  const span = CHAPTER_MAX_DAYS - CHAPTER_MIN_DAYS + 1;
  let index = 0;
  let start = epoch;
  // Chapter n's length is a pure function of (seed, n). Bounded: even at the 21-day floor, 4000
  // iterations covers >200 years past the epoch, so this cannot spin on a bad date.
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
  // Unreachable (the loop returns on its final pass); present so the function is total.
  throw new Error('chapterFor: unreachable');
}

/** Dates before the epoch are clamped to chapter 0 — a guard for clock-skewed or fixture dates. */
export function chapterForSafe(featureKey: string, geometryHash: string, dateKey: string): Chapter {
  const epoch = dayNumber(PULSE_EPOCH);
  return chapterFor(featureKey, geometryHash, dayNumber(dateKey) < epoch ? PULSE_EPOCH : dateKey);
}
