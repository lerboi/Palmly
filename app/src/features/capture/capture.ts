// Pure capture state-machine contract (audit F1.4, UIUX §2.3) — no React/RN imports, so it is
// unit-testable and shared by CaptureView + the /dev walk.

/**
 * The full §2.3 capture guidance state machine: seven guidance states (searching + the five
 * corrective tolerances + ready) plus `captured` (freeze) and `review` ("Looks sharp / Retake").
 * The live landmark/exposure signals that drive these are device-only ([~]).
 */
export type CaptureState =
  | 'searching'
  | 'too_far'
  | 'too_close'
  | 'not_flat'
  | 'tilted'
  | 'dark'
  | 'ready'
  | 'captured'
  | 'review';
export type CaptureMode = 'palm' | 'face';

/** The five NOT-ready tolerance states (the guide stays in the not-ready treatment). */
export const CORRECTIVE_STATES: CaptureState[] = ['too_far', 'too_close', 'not_flat', 'tilted', 'dark'];

/** All nine states, in walk order (searching → tolerances → ready → captured → review). */
export const CAPTURE_STATES: CaptureState[] = ['searching', 'too_far', 'too_close', 'not_flat', 'tilted', 'dark', 'ready', 'captured', 'review'];

/**
 * The single instruction line for a state (§2.3 — one at a time, never stacked). The FIVE corrective
 * strings are the a11y differentiator (spoken via the live region). Mode/hand-aware for searching +
 * tilted. Pure — unit-tested to pin the contract.
 */
export function captureInstruction(state: CaptureState, mode: CaptureMode, handSide: 'left' | 'right' = 'right'): string {
  switch (state) {
    case 'searching':
      return mode === 'palm' ? `Hold your ${handSide} palm up to the camera` : 'Center your face in the frame';
    case 'too_far':
      return 'Move closer';
    case 'too_close':
      return 'A little further';
    case 'not_flat':
      return 'Flatten your hand, fingers relaxed';
    case 'tilted':
      return mode === 'palm' ? 'Face your palm to the camera' : 'Face the camera straight on';
    case 'dark':
      return 'Find a little more light';
    case 'ready':
      return 'Hold still…';
    case 'captured':
      return 'Got it';
    case 'review':
      return 'Looks sharp';
  }
}
