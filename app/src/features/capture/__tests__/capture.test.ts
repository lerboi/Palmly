import { CAPTURE_STATES, CORRECTIVE_STATES, captureInstruction } from '../capture';

describe('capture state machine (F1.4)', () => {
  it('models the full §2.3 nine-state union', () => {
    expect(CAPTURE_STATES).toEqual(['searching', 'too_far', 'too_close', 'not_flat', 'tilted', 'dark', 'ready', 'captured', 'review']);
  });

  it('every state has a non-empty instruction (palm + face)', () => {
    for (const s of CAPTURE_STATES) {
      expect(captureInstruction(s, 'palm').length).toBeGreaterThan(0);
      expect(captureInstruction(s, 'face').length).toBeGreaterThan(0);
    }
  });

  it('pins the five corrective instruction strings (§2.3)', () => {
    expect(captureInstruction('too_far', 'palm')).toBe('Move closer');
    expect(captureInstruction('too_close', 'palm')).toBe('A little further');
    expect(captureInstruction('not_flat', 'palm')).toBe('Flatten your hand, fingers relaxed');
    expect(captureInstruction('tilted', 'palm')).toBe('Face your palm to the camera');
    expect(captureInstruction('dark', 'palm')).toBe('Find a little more light');
    expect(CORRECTIVE_STATES).toEqual(['too_far', 'too_close', 'not_flat', 'tilted', 'dark']);
  });

  it('searching is hand-aware for palm, ready holds still', () => {
    expect(captureInstruction('searching', 'palm', 'left')).toBe('Hold your left palm up to the camera');
    expect(captureInstruction('searching', 'palm', 'right')).toContain('right');
    expect(captureInstruction('ready', 'palm')).toBe('Perfect — tap to capture');
    expect(captureInstruction('review', 'palm')).toBe('Looks sharp');
  });
});
