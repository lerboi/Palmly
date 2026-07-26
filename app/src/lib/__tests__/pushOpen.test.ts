import { pushOpenType } from '../pushOpen';

/**
 * RF0.T4 — the `push_opened` mapper. The event existed in the typed map with no emitter; this is
 * the pure half of closing that gap (the hook itself needs a device notification to fire).
 */
describe('pushOpenType', () => {
  it('reads the server-stamped type off a notification payload', () => {
    expect(pushOpenType({ type: 'daily_pulse', deep_link: 'palmly://fortune' })).toBe('daily_pulse');
  });

  it('returns null for anything that is not one of ours', () => {
    expect(pushOpenType(undefined)).toBeNull();
    expect(pushOpenType(null)).toBeNull();
    expect(pushOpenType({})).toBeNull();
    expect(pushOpenType({ type: 42 })).toBeNull();
    expect(pushOpenType({ type: '   ' })).toBeNull();
    expect(pushOpenType('daily_pulse')).toBeNull();
  });

  it('trims, and refuses an unbounded value (analytics cardinality)', () => {
    expect(pushOpenType({ type: '  reading_ready  ' })).toBe('reading_ready');
    expect(pushOpenType({ type: 'x'.repeat(65) })).toBeNull();
    expect(pushOpenType({ type: 'x'.repeat(64) })).toBe('x'.repeat(64));
  });
});
