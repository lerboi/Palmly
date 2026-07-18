import { AUTO_PRESENT_DELAY_MS, elapsedLabel, shouldAutoPresent } from '../compatCopy';

describe('elapsedLabel (F1.7 red-thread nudge)', () => {
  const base = Date.parse('2026-07-19T12:00:00Z');
  it('renders compact elapsed labels', () => {
    expect(elapsedLabel('2026-07-19T12:00:00Z', base)).toBe('just now');
    expect(elapsedLabel('2026-07-19T11:30:00Z', base)).toBe('30 min ago');
    expect(elapsedLabel('2026-07-19T09:00:00Z', base)).toBe('3 hours ago');
    expect(elapsedLabel('2026-07-19T11:00:00Z', base)).toBe('1 hour ago');
    expect(elapsedLabel('2026-07-17T12:00:00Z', base)).toBe('2 days ago');
    expect(elapsedLabel('2026-07-18T11:00:00Z', base)).toBe('1 day ago');
  });
  it('is safe on a bad or future timestamp', () => {
    expect(elapsedLabel('not-a-date', base)).toBe('just now');
    expect(elapsedLabel('2026-07-20T00:00:00Z', base)).toBe('just now');
  });
});

describe('compat auto-present gate (F1.7 §2.7.4)', () => {
  it('presents only once the score is in and only if not already seen', () => {
    expect(shouldAutoPresent('complete', false)).toBe(true);
    expect(shouldAutoPresent('complete', true)).toBe(false); // one dismissal disables it per pair
    expect(shouldAutoPresent('computing', false)).toBe(false);
    expect(shouldAutoPresent('awaiting_b', false)).toBe(false);
    expect(shouldAutoPresent(null, false)).toBe(false);
  });

  it('fires the present callback ~2s after the score lands (fake timers)', () => {
    jest.useFakeTimers();
    try {
      const present = jest.fn();
      const id = setTimeout(present, AUTO_PRESENT_DELAY_MS);
      jest.advanceTimersByTime(AUTO_PRESENT_DELAY_MS - 1);
      expect(present).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(present).toHaveBeenCalledTimes(1);
      clearTimeout(id);
    } finally {
      jest.useRealTimers();
    }
  });
});
