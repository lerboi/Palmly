/// <reference types="jest" />
import { motion } from '../tokens';
import { lightTheme, darkTheme } from '../theme';

/**
 * Contract test for the motion foundation (redesign v2 §4.1). Pins the duration ladder + the
 * shape of the easing / spring / stagger tokens the whole UI animates on, so a stray edit to a
 * timing surfaces here (same guardrail role as `tokens.test.ts`). Pure data — no worklet runtime.
 */
describe('motion tokens — animation foundation (redesign v2 §4.1)', () => {
  it('pins the duration ladder (ms)', () => {
    expect(motion.duration.instant).toBe(0);
    expect(motion.duration.fast).toBe(120);
    expect(motion.duration.base).toBe(220);
    expect(motion.duration.slow).toBe(360);
    expect(motion.duration.draw).toBe(1200);
  });

  it('stores easing as 4-point cubic-bezier control tuples (reanimated-free)', () => {
    for (const curve of [motion.easing.standard, motion.easing.decelerate]) {
      expect(curve).toHaveLength(4);
      for (const n of curve) expect(typeof n).toBe('number');
    }
  });

  it('defines the press + entrance spring configs', () => {
    expect(motion.spring.press).toEqual({ damping: 18, stiffness: 320, mass: 0.6 });
    expect(motion.spring.entrance).toEqual({ damping: 20, stiffness: 180, mass: 1 });
  });

  it('defines per-index stagger deltas (ms)', () => {
    expect(motion.stagger.list).toBe(60);
    expect(motion.stagger.reveal).toBe(90);
  });

  it('surfaces the same motion group on both themes', () => {
    expect(lightTheme.motion).toBe(motion);
    expect(darkTheme.motion).toBe(motion);
  });
});
