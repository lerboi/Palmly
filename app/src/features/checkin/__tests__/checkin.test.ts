import {
  CHECKIN_PRIVACY_LINE,
  checkInMessage,
  checkInPhase,
  FALLBACK_AFTER_MS,
  HINT_AFTER_MS,
  isFallbackPrimary,
  MATCH_FRAMES,
} from '../checkin';
import { canonicalSignatureFromLive, handDistanceLocal, isSamePalm, SEAL_MATCH_THRESHOLD } from '../sealMatch';
import { handSignature } from '@/features/capture/handSignature';

/**
 * RF3 — the ritual's two testable halves: the timeout ladder (which is really a copy contract) and
 * the on-device match (which must agree with the server's metric or it is comparing nothing).
 */

const base = { elapsedMs: 0, handPresent: true, poseReady: true, matchStreak: 0, settled: false };

describe('checkInPhase', () => {
  it('walks searching → adjusting → reading as the hand arrives and settles', () => {
    expect(checkInPhase({ ...base, handPresent: false })).toBe('searching');
    expect(checkInPhase({ ...base, poseReady: false })).toBe('adjusting');
    expect(checkInPhase(base)).toBe('reading');
  });

  it('accepts only after MATCH_FRAMES consecutive matching frames (anti-flicker)', () => {
    expect(checkInPhase({ ...base, matchStreak: MATCH_FRAMES - 1 })).toBe('reading');
    expect(checkInPhase({ ...base, matchStreak: MATCH_FRAMES })).toBe('matched');
  });

  it('latches once matched — a hand leaving frame cannot un-seal the day', () => {
    expect(checkInPhase({ ...base, settled: true, handPresent: false, elapsedMs: 60_000 })).toBe('matched');
  });

  it('offers a hint at 10s and the tap fallback at 20s', () => {
    expect(checkInPhase({ ...base, elapsedMs: HINT_AFTER_MS - 1 })).toBe('reading');
    expect(checkInPhase({ ...base, elapsedMs: HINT_AFTER_MS })).toBe('hint');
    expect(checkInPhase({ ...base, elapsedMs: FALLBACK_AFTER_MS })).toBe('fallback');
    expect(isFallbackPrimary('fallback')).toBe(true);
    expect(isFallbackPrimary('hint')).toBe(false);
  });

  it('puts the escape hatch ahead of live guidance once the ladder has fired', () => {
    // Someone 20 seconds in needs the way out more than another "flatten your hand".
    expect(checkInPhase({ ...base, elapsedMs: FALLBACK_AFTER_MS, poseReady: false })).toBe('fallback');
  });
});

describe('checkInMessage', () => {
  it('never accuses the user of not being themselves', () => {
    const all = (['searching', 'adjusting', 'reading', 'matched', 'hint', 'fallback'] as const).map((p) => checkInMessage(p, 5));
    for (const m of all) {
      expect(m).not.toMatch(/not your|different (hand|person|palm)|failed|wrong|denied|no match/i);
    }
  });

  it('blames angle and light — the real causes, and the actionable ones', () => {
    expect(checkInMessage('hint')).toMatch(/angle and light/);
    expect(checkInMessage('fallback')).toMatch(/angle and light/);
  });

  it('always leaves the tap open, and makes it the offer once the ladder ends', () => {
    expect(checkInMessage('fallback')).toMatch(/tap/i);
  });

  it('counts the day on success, and does not invent a number on day one', () => {
    expect(checkInMessage('matched', 12)).toBe('Your lines hold. Day 12.');
    expect(checkInMessage('matched', 1)).toBe('Your lines hold.');
    expect(checkInMessage('matched')).toBe('Your lines hold.');
  });

  it('states the privacy promise in words a user can check', () => {
    expect(CHECKIN_PRIVACY_LINE).toMatch(/No photo is taken/);
    expect(CHECKIN_PRIVACY_LINE).toMatch(/nothing is uploaded/);
  });
});

// ── The match ────────────────────────────────────────────────────────────────────────────────────

/** A plausible 21-landmark hand in pixel space, scaled by `k` and shifted by `dx`. */
function hand(k = 1, dx = 0): [number, number][] {
  const pts: [number, number][] = [
    [500, 900], // 0 wrist
    [430, 830], [390, 780], [360, 740], [330, 710], // thumb
    [430, 700], [420, 620], [412, 560], [405, 510], // index
    [500, 680], [500, 590], [500, 525], [500, 470], // middle
    [570, 700], [578, 620], [585, 565], [590, 515], // ring
    [635, 730], [650, 665], [660, 620], [668, 580], // pinky
  ];
  return pts.map(([x, y]) => [x * k + dx, y * k + dx]);
}

describe('canonicalSignatureFromLive', () => {
  it('is SCALE-invariant — the same hand near and far reads the same', () => {
    const near = canonicalSignatureFromLive(hand(1))!;
    const far = canonicalSignatureFromLive(hand(0.55))!;
    expect(near).not.toBeNull();
    expect(handDistanceLocal(near, far)).toBeLessThan(0.001);
  });

  it('is translation-invariant — position in frame does not change the signature', () => {
    const a = canonicalSignatureFromLive(hand(1, 0))!;
    const b = canonicalSignatureFromLive(hand(1, 220))!;
    expect(handDistanceLocal(a, b)).toBeLessThan(0.001);
  });

  it('normalizes to the cv1 canonical span, so it is comparable with the enrolled signature', () => {
    // The enrolled signature is `handSignature` over canonical-space landmarks; feeding the SAME
    // canonical points through the live path must reproduce it. This is the property that makes the
    // whole check meaningful rather than two unrelated numbers being subtracted.
    const live = hand(1);
    const span = Math.hypot(live[0][0] - live[9][0], live[0][1] - live[9][1]);
    const scale = (560 / 1536) / span;
    const canonical = live.map(([x, y]) => [x * scale, y * scale] as [number, number]);
    expect(canonicalSignatureFromLive(live)).toEqual(handSignature(canonical));
  });

  it('returns null rather than a wrong answer on a short or degenerate hand', () => {
    expect(canonicalSignatureFromLive(hand().slice(0, 12))).toBeNull();
    const degenerate = hand();
    degenerate[9] = [...degenerate[0]] as [number, number]; // wrist == middle MCP
    expect(canonicalSignatureFromLive(degenerate)).toBeNull();
  });
});

describe('isSamePalm', () => {
  const enrolled = canonicalSignatureFromLive(hand(1))!;

  it('matches the enrolled palm at any distance from the camera', () => {
    expect(isSamePalm(canonicalSignatureFromLive(hand(0.6)), enrolled)).toBe(true);
    expect(isSamePalm(canonicalSignatureFromLive(hand(1.4)), enrolled)).toBe(true);
  });

  it('rejects a hand with genuinely different proportions', () => {
    // Longer fingers on the same palm width — a different hand's shape, not a different pose.
    const other = hand(1).map(([x, y], i) => (i >= 5 ? [x, y - 60] : [x, y]) as [number, number]);
    expect(isSamePalm(canonicalSignatureFromLive(other), enrolled)).toBe(false);
  });

  it('is unknown, not "no", when either signature is missing', () => {
    expect(isSamePalm(null, enrolled)).toBe(false);
    expect(isSamePalm(enrolled, null)).toBe(false);
  });

  it('uses a threshold looser than the pipeline’s — false negatives here are the hostile failure', () => {
    expect(SEAL_MATCH_THRESHOLD).toBeGreaterThan(0.025);
  });
});

describe('handDistanceLocal', () => {
  it('mirrors the server metric: mean absolute difference over 5 components', () => {
    const a = { fingers: [1, 1, 1, 1], palm_width: 1 };
    const b = { fingers: [1.1, 1, 1, 1], palm_width: 1 };
    expect(handDistanceLocal(a, b)).toBeCloseTo(0.1 / 5, 10);
    expect(handDistanceLocal(a, a)).toBe(0);
  });
});
