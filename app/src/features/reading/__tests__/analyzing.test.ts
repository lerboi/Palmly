import { STAGES, failureHint, overrunLevel, stageFor, visibleGeometry } from '../analyzing';
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

  it('gives a specific hint for a non-hand failure', () => {
    expect(failureHint('not_a_hand')).toContain('palm');
    expect(failureHint('timeout')).not.toContain('palm');
  });
});
