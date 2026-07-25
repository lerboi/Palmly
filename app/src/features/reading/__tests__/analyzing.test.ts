import {
  CREEP_FROM,
  CREEP_TO,
  FAILURE_DEFAULT,
  RING_GLOW_WIDTH,
  SOCIAL_PROOF,
  STAGES,
  analyzingProgress,
  failureHint,
  overrunLevel,
  ringGeometry,
  socialProofAt,
  stageFor,
  stageMessage,
  visibleGeometry,
} from '../analyzing';
import { PREVIEW_GEOMETRY } from '../reveal';

describe('analyzing loader logic (P6.T1)', () => {
  it('advances line-tracing stages on a timer during extraction, capped before the KB stage', () => {
    expect(stageFor('extracting', 0)).toBe(0);
    expect(stageFor('extracting', 4000)).toBe(1);
    expect(stageFor('extracting', 8000)).toBe(2);
    expect(stageFor('extracting', 30_000)).toBe(2); // never auto-advances into the final KB stage
  });

  it('locks to the final "consulting the classics" stage once narrating/terminal', () => {
    const last = STAGES.length - 1;
    expect(stageFor('narrating', 0)).toBe(last);
    expect(stageFor('complete', 1000)).toBe(last);
    expect(stageFor('matched', 0)).toBe(last);
  });

  it('escalates overrun handling at 45s (soft) and 75s (notify)', () => {
    expect(overrunLevel(10_000)).toBe('normal');
    expect(overrunLevel(45_000)).toBe('soft');
    expect(overrunLevel(80_000)).toBe('notify');
  });

  it('reveals lines progressively (drawn so far)', () => {
    expect(Object.keys(visibleGeometry(PREVIEW_GEOMETRY, 0))).toEqual(['heart_line']);
    expect(Object.keys(visibleGeometry(PREVIEW_GEOMETRY, 2)).sort()).toEqual(['head_line', 'heart_line', 'life_line']);
  });

  it('maps the real backend failure_reason vocabulary to specific, warm hints', () => {
    // Values the pipeline actually emits (supabase/functions/_shared/extraction.ts).
    expect(failureHint('not_a_hand')).toContain('palm');
    expect(failureHint('not_a_face')).toContain('face');
    // gemini_finish_<reason> is a prefix family (safety / max_tokens / recitation / …).
    const geminiHint = failureHint('gemini_finish_safety');
    expect(geminiHint).toBe(failureHint('gemini_finish_max_tokens'));
    expect(geminiHint).toContain('interrupted');
    expect(failureHint('invalid_json')).toBe(failureHint('schema_invalid'));
    expect(failureHint('invalid_json')).toContain('unclear');
    // A reason the pipeline can't emit, and no reason at all, both fall back to the warm generic.
    expect(failureHint('timeout')).not.toContain('palm');
    expect(failureHint(null)).toBe(FAILURE_DEFAULT);
    expect(failureHint(undefined)).toBe(FAILURE_DEFAULT);
  });

  it('rotates the social-proof line over time and wraps', () => {
    expect(socialProofAt(0)).toBe(SOCIAL_PROOF[0]);
    expect(socialProofAt(4000)).toBe(SOCIAL_PROOF[1]);
    expect(socialProofAt(8000)).toBe(SOCIAL_PROOF[2]);
    expect(socialProofAt(12_000)).toBe(SOCIAL_PROOF[0]); // wraps after the last item
  });
});

/**
 * The ring's geometry and its progress (Audit-4 CO-13). The ring parked at 75% for the slowest
 * stretch of the pipeline — the exact moment a user starts wondering whether the app has hung — and
 * its glow was clipped by its own viewport. Both are pure math, so both are pinned here.
 */
describe('analyzing progress ring (Audit-4 CO-13)', () => {
  it('pads the viewport so the glow can never clip', () => {
    for (const size of [120, 232, 300]) {
      const g = ringGeometry(size);
      // The glow is centred on `r` and RING_GLOW_WIDTH wide, so its outer edge is r + half.
      expect(g.r + RING_GLOW_WIDTH / 2).toBeLessThanOrEqual(g.size / 2);
      expect(g.cx).toBe(g.size / 2);
      expect(g.cy).toBe(g.size / 2);
      expect(g.circumference).toBeCloseTo(2 * Math.PI * g.r, 6);
    }
  });

  it('keeps the visible ring bigger than the diagram it encircles', () => {
    const g = ringGeometry(232);
    expect(g.r * 2).toBeGreaterThan(232);
  });

  it('creeps through the long extraction stage instead of parking at 75%', () => {
    const stage = STAGES.length - 2; // the last extraction stage — where it used to sit still
    const at = (ms: number) => analyzingProgress(stage, ms);
    const entry = (STAGES.length - 2) * 3500;
    expect(at(entry)).toBeCloseTo(CREEP_FROM, 6);
    // Strictly increasing over the whole overrun window — never parks.
    let prev = at(entry);
    for (let ms = entry + 2000; ms <= entry + 120_000; ms += 2000) {
      const now = at(ms);
      expect(now).toBeGreaterThan(prev);
      prev = now;
    }
    // …and asymptotic: it approaches 92% without ever claiming to be done.
    expect(at(entry + 120_000)).toBeLessThan(CREEP_TO);
    expect(at(entry + 120_000)).toBeGreaterThan(0.9);
  });

  it('still steps the early stages and completes on the narrative stage', () => {
    expect(analyzingProgress(0, 0)).toBeCloseTo(0.25, 6);
    expect(analyzingProgress(1, 4000)).toBeCloseTo(0.5, 6);
    expect(analyzingProgress(STAGES.length - 1, 0)).toBe(1);
  });
});

/** Whose palm is being traced (Audit-4 SH-7) — the copy may only be possessive when it is true. */
describe('analyzing stage copy (Audit-4 SH-7)', () => {
  it('drops the possessive while the palm on screen is an abstract motif', () => {
    for (let i = 0; i < STAGES.length - 1; i++) {
      expect(stageMessage(i, false)).not.toMatch(/\byour\b/i);
      expect(stageMessage(i, true)).toMatch(/\byour\b/i);
    }
  });

  it('keeps the classics stage identical either way (it claims nothing about the reader)', () => {
    const last = STAGES.length - 1;
    expect(stageMessage(last, false)).toBe(stageMessage(last, true));
  });

  it('clamps out-of-range stages instead of returning undefined', () => {
    expect(stageMessage(-1, false)).toBe(STAGES[0].abstract);
    expect(stageMessage(99, true)).toBe(STAGES[STAGES.length - 1].message);
  });
});
