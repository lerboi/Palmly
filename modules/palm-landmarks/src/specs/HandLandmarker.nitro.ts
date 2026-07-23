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

/** The result of running the landmarker on one camera frame. */
export interface HandFrameResult {
  /** Detected hands (≤ numHands), empty when no hand is in view. */
  hands: HandDetection[];
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
