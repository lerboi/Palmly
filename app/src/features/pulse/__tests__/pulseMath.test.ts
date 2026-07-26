import vectorsJson from '../../../../../supabase/functions/_shared/pulse.vectors.json';
import {
  CHAPTER_ARCHETYPES,
  chapterFor,
  chapterForSafe,
  chapterEndLabel,
  featureEyebrow,
  featureLabel,
  fnv1a,
  PULSE_FACE_KEYS,
  PULSE_FEATURE_KEYS,
  PULSE_PALM_KEYS,
  pulseFeatureKey,
  pulsePoolFor,
  shiftDateKey,
  type SubjectKind,
} from '../pulseMath';

/**
 * RF2.T1 — the client mirror, asserted against the SAME committed vector file the Deno suite uses.
 *
 * This is the test that keeps the morning push honest. The server names a feature in a notification;
 * this module names one on the card. They are two implementations of one algorithm in two languages
 * on two runtimes, and the only thing standing between them and silent divergence is this file
 * reading the server's vectors and getting the same answers.
 *
 * The import reaches out of `app/` into `supabase/` on purpose, and only here: this is a TEST-only
 * dependency, so Metro never sees it, and any indirection (a copied file, a generated shim) would
 * put something between the two implementations that could itself go stale — which is the exact
 * failure the vectors exist to catch.
 */
const vectors = vectorsJson as unknown as {
  fnv1a: { input: string; hash: number }[];
  pools: { kinds: SubjectKind[]; pool: string[] }[];
  selection: { userId: string; dateKey: string; kinds: SubjectKind[]; feature: string | null }[];
  chapters: { featureKey: string; geometryHash: string; dateKey: string; chapter: ReturnType<typeof chapterFor> }[];
};

describe('mirror vectors (shared with supabase/functions/_shared/pulse.test.ts)', () => {
  it('the vector file is really there and non-trivial', () => {
    expect(vectors.selection.length).toBeGreaterThan(50);
    expect(vectors.chapters.length).toBeGreaterThan(20);
  });

  it('fnv1a matches the server hash for every vector', () => {
    for (const v of vectors.fnv1a) expect(fnv1a(v.input)).toBe(v.hash);
  });

  it('the empty string hashes to the FNV-1a offset basis', () => {
    expect(fnv1a('')).toBe(0x811c9dc5);
  });

  it('pools match', () => {
    for (const v of vectors.pools) expect(pulsePoolFor(v.kinds)).toEqual(v.pool);
  });

  it('every (user, date, kinds) → feature matches the server', () => {
    for (const v of vectors.selection) {
      expect(pulseFeatureKey(v.userId, v.dateKey, v.kinds)).toBe(v.feature);
    }
  });

  it('every chapter matches the server', () => {
    for (const v of vectors.chapters) {
      expect(chapterFor(v.featureKey, v.geometryHash, v.dateKey)).toEqual(v.chapter);
    }
  });
});

describe('selection', () => {
  it('is deterministic', () => {
    for (let i = 0; i < 20; i++) {
      expect(pulseFeatureKey('u', '2026-07-26', ['palm_left'])).toBe(pulseFeatureKey('u', '2026-07-26', ['palm_left']));
    }
  });

  it('draws only from the kinds the user actually has', () => {
    expect(PULSE_PALM_KEYS).toContain(pulseFeatureKey('u', '2026-07-26', ['palm_left']));
    expect(PULSE_FACE_KEYS).toContain(pulseFeatureKey('u', '2026-07-26', ['face']));
  });

  it('returns null with no canonical reading — a first-run user has no line of the day', () => {
    expect(pulseFeatureKey('u', '2026-07-26', [])).toBeNull();
  });

  it('never repeats on consecutive days, over a year', () => {
    let prev: string | null = null;
    for (let i = 0; i < 365; i++) {
      const key = pulseFeatureKey('rotator', shiftDateKey('2026-01-01', i), ['palm_left', 'face']);
      expect(key).not.toBe(prev);
      prev = key;
    }
  });
});

describe('chapters', () => {
  it('always contains the date it was asked about', () => {
    for (const f of PULSE_FEATURE_KEYS) {
      const c = chapterFor(f, 'hash', '2026-07-26');
      expect(c.starts_on <= '2026-07-26').toBe(true);
      expect('2026-07-26' <= c.ends_on).toBe(true);
    }
  });

  it('marks exactly the first day as the boundary', () => {
    const c = chapterFor('fate', 'hash', '2026-07-26');
    expect(chapterFor('fate', 'hash', c.starts_on).is_boundary).toBe(true);
    expect(chapterFor('fate', 'hash', shiftDateKey(c.starts_on, 1)).is_boundary).toBe(false);
  });

  it('only ever produces archetypes the catalog defines', () => {
    let cursor = '2026-01-01';
    for (let i = 0; i < 12; i++) {
      const c = chapterFor('heart', 'hash', cursor);
      expect(CHAPTER_ARCHETYPES).toContain(c.archetype);
      cursor = shiftDateKey(c.ends_on, 1);
    }
  });

  it('clamps a pre-epoch date instead of running backwards (fixture dates)', () => {
    expect(chapterForSafe('heart', 'hash', '2019-01-01').index).toBe(0);
  });
});

describe('presentation helpers', () => {
  it('names every feature in human words', () => {
    for (const k of PULSE_FEATURE_KEYS) {
      expect(featureLabel(k)).not.toBe(k.includes('_') ? k : '');
      expect(featureLabel(k)).not.toMatch(/_/);
    }
    expect(featureLabel('heart')).toBe('heart line');
    expect(featureLabel('eyebrows')).toBe('brows');
  });

  it('builds the card eyebrow in the copy sheet’s exact shape', () => {
    expect(featureEyebrow('heart')).toBe('TODAY · YOUR HEART LINE');
    expect(featureEyebrow('hand_shape')).toBe('TODAY · YOUR HAND SHAPE');
  });

  it('formats the chapter end date without drifting a day across timezones', () => {
    // A plain calendar key must render as itself. Parsed as local time in UTC+X this would print
    // the 13th — the same class of bug as SH-14, one day off, on the one date the card promises.
    expect(chapterEndLabel('2026-08-14', 'en-US')).toBe('Aug 14');
    expect(chapterEndLabel('2026-01-01', 'en-US')).toBe('Jan 1');
  });
});
