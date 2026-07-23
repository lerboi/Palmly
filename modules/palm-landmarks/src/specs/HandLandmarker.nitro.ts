import type { HybridObject } from 'react-native-nitro-modules';
import type { Frame } from 'react-native-vision-camera';

/**
 * One MediaPipe hand landmark. `x`/`y` are normalized [0,1] in the upright (rotation-applied)
 * frame; `z` is depth relative to the wrist (negative = toward the camera), same scale as `x`.
 */
export interface HandPoint {
  x: number;
  y: number;
  z: number;
}

/** One detected hand: the 21 HandLandmarker keypoints plus handedness. */
export interface HandDetection {
  /** The 21 normalized landmarks, indexed per the MediaPipe hand model (0 = wrist). */
  landmarks: HandPoint[];
  /**
   * MediaPipe's handedness label for the *physical* hand ("Left" | "Right"), already
   * corrected for the back-camera's unmirrored view.
   */
  handedness: string;
  /** Handedness confidence [0,1]. */
  confidence: number;
}

/**
 * Per-frame capture-quality measurements (P2.T4) — the raw signals behind the UIUX §2.3
 * guidance state machine (too far/close · not flat · tilted · dark). Thresholds/states live in
 * JS (P4.T2); this layer only measures. Hand-geometry fields are meaningful only when
 * {@linkcode HandFrameResult.hands} is non-empty (they read 0/false while searching);
 * `exposure` is always real.
 */
export interface CaptureQuality {
  /** Fraction of the upright frame's area covered by the first hand's bounding box [0,1]. */
  bboxFraction: number;
  /** First hand's bbox center, normalized upright coords [0,1]. */
  centerX: number;
  centerY: number;
  /**
   * Palm-plane tilt from the image plane in degrees — 0 = palm squarely facing the camera,
   * 90 = edge-on (§2.3 "tilted" trigger is > 12°). Orientation-agnostic (same for palm/back).
   */
  tiltDeg: number;
  /**
   * Whether the palm side (not the back of the hand) faces the camera, derived from the
   * palm-normal winding + handedness. Sign convention calibrated on-device (P2.T4 verify).
   */
  palmFacing: boolean;
  /**
   * Fingertip z-spread: mean |z(tip) − z(MCP)| across the five fingers, normalized by hand
   * size. Low = flat/relaxed hand; rises as fingers curl (§2.3 "not flat" trigger).
   */
  flatness: number;
  /** Mean luma of the analyzed frame [0,1] (≲0.25 = dark, ≳0.9 = blown out — §2.3 "dark/glare"). */
  exposure: number;
}

/** The result of running the landmarker on one camera frame. */
export interface HandFrameResult {
  /** Detected hands (≤ numHands), empty when no hand is in view. */
  hands: HandDetection[];
  /** Capture-quality signals for this frame (see {@linkcode CaptureQuality}). */
  quality: CaptureQuality;
  /** Landmarker inference duration for this frame, milliseconds. */
  inferenceTimeMs: number;
  /** Upright frame width in pixels the normalized coordinates refer to. */
  width: number;
  /** Upright frame height in pixels the normalized coordinates refer to. */
  height: number;
}

/**
 * A MediaPipe Tasks `HandLandmarker` bound to native camera frames (Backend §2.2, D5).
 *
 * Runs in VIDEO mode: `detect()` is synchronous on the caller's thread (VisionCamera's frame-output
 * thread), so the caller may `dispose()` the frame as soon as it returns, and the result always
 * belongs to exactly the frame that was passed in (no LIVE_STREAM staleness) — see the P2
 * Decision Log entry. Use the GPU delegate (default) for real-time rates.
 */
export interface HandLandmarker extends HybridObject<{ android: 'kotlin' }> {
  /** Synchronously detect hands in the given camera frame. */
  detect(frame: Frame): HandFrameResult;
}
