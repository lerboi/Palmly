/**
 * The check-in ritual's state machine (Audit-5 · 02 §6), kept pure so the timeout ladder is
 * unit-testable without a camera.
 *
 * The ladder exists because a same-palm check CAN fail honestly — angle, light, a hand held at a
 * different distance — and the copy for that moment is the most delicate in the app. It must never
 * say or imply "this is not your palm": the user knows whose hand it is, so an accusation would be
 * both wrong and hostile. Every message here blames the conditions, and the escape hatch (tap
 * instead) is always one press away and always counts the day.
 */

export type CheckInPhase =
  /** Camera up, no hand found yet. */
  | 'searching'
  /** A hand is in frame but the pose is not readable yet. */
  | 'adjusting'
  /** Good pose — reading the signature. */
  | 'reading'
  /** Matched. The seal stamps and the day is sealed with `method: 'palm'`. */
  | 'matched'
  /** Long enough without a match that the user needs a hint. */
  | 'hint'
  /** Long enough that the tap fallback becomes the primary action. */
  | 'fallback';

/** After this long without a match, offer a hint about angle and light. */
export const HINT_AFTER_MS = 10_000;
/** After this long, promote "seal it with a tap instead" to the primary button. */
export const FALLBACK_AFTER_MS = 20_000;
/** Consecutive matching frames before the ritual accepts. Anti-flicker, like the capture vote. */
export const MATCH_FRAMES = 3;

export interface CheckInInput {
  /** ms since the ritual opened. */
  elapsedMs: number;
  /** A hand is currently in frame. */
  handPresent: boolean;
  /** The pose is inside tolerances (flat, facing, framed) — the capture engine's `ready`. */
  poseReady: boolean;
  /** How many consecutive frames have matched the enrolled signature. */
  matchStreak: number;
  /** Already matched — the phase latches, so a hand leaving frame cannot un-seal the day. */
  settled: boolean;
}

/** Which phase the ritual is in. Pure: same inputs, same phase, no clock of its own. */
export function checkInPhase(input: CheckInInput): CheckInPhase {
  if (input.settled || input.matchStreak >= MATCH_FRAMES) return 'matched';
  // The ladder outranks the live state: a user who has been trying for 20 seconds needs the way
  // out more than they need to be told their hand is tilted.
  if (input.elapsedMs >= FALLBACK_AFTER_MS) return 'fallback';
  if (input.elapsedMs >= HINT_AFTER_MS) return 'hint';
  if (!input.handPresent) return 'searching';
  return input.poseReady ? 'reading' : 'adjusting';
}

/**
 * The line shown for a phase (02 §9).
 *
 * Note what none of these say: nothing here mentions a non-match, a failure, or a different person.
 * `hint` names angle and light because those are the real causes, and because they are things the
 * user can act on.
 */
export function checkInMessage(phase: CheckInPhase, day?: number): string {
  switch (phase) {
    case 'searching':
      return 'Hold your palm to the camera.';
    case 'adjusting':
      return 'Flatten your hand a little.';
    case 'reading':
      return 'Hold steady — reading your lines…';
    case 'matched':
      // Day 1 has no number to be proud of yet, so it does not pretend to (02 §9).
      return day && day > 1 ? `Your lines hold. Day ${day}.` : 'Your lines hold.';
    case 'hint':
      return 'Palms shift with angle and light — try flattening your hand.';
    case 'fallback':
      return 'Palms shift with angle and light. You can seal today with a tap instead.';
  }
}

/** The privacy line, shown in EVERY phase of the ritual — an acceptance criterion (02 §10.4). */
export const CHECKIN_PRIVACY_LINE = 'On your phone only. No photo is taken, nothing is uploaded.';

/** The tap fallback is offered from the start, and becomes the PRIMARY action at `fallback`. */
export const isFallbackPrimary = (phase: CheckInPhase): boolean => phase === 'fallback';
