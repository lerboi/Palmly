import type { CameraOutput } from 'react-native-vision-camera';
import type { HybridObject } from 'react-native-nitro-modules';
import type { HandFrameResult, HandLandmarker, HandPoint } from './HandLandmarker.nitro';

/** Which compute delegate MediaPipe should run inference on. */
export type HandDelegate = 'gpu' | 'cpu';

export interface HandLandmarkerOptions {
  /**
   * Maximum number of hands to track.
   * @default 1
   */
  numHands?: number;
  /**
   * Minimum palm-detection confidence for a hand to be reported.
   * @default 0.5
   */
  minHandDetectionConfidence?: number;
  /**
   * Minimum hand-presence score to keep tracking without re-running palm detection.
   * @default 0.5
   */
  minHandPresenceConfidence?: number;
  /**
   * Minimum landmark-tracking confidence.
   * @default 0.5
   */
  minTrackingConfidence?: number;
  /**
   * Compute delegate. CPU (XNNPACK) is the measured default — on the S20+ it sustains
   * 16.6-17.8fps tracking vs 13-14.7 on the GPU delegate, whose OpenCL load falls back to an
   * ICD loader on Samsung (P2 Decision Log 2026-07-24). Pass 'gpu' to A/B on other devices.
   * @default 'cpu'
   */
  delegate?: HandDelegate;
}

export interface HandLandmarkerOutputOptions extends HandLandmarkerOptions {
  /**
   * Called with the landmark result of every analyzed camera frame. Runs on the JS thread.
   * Frames that arrive while the landmarker is busy are dropped natively
   * (KEEP_ONLY_LATEST backpressure), so the callback rate ≈ the landmarker's real fps.
   */
  onHands: (result: HandFrameResult) => void;
  /** Called when a frame failed to analyze. */
  onError: (message: string) => void;
}

/**
 * The canonical palm crop (P4.T3, Backend §6.2 + §6.6 item 2): the input contract of the
 * extraction pipeline. Produced by {@linkcode HandLandmarkerFactory.canonicalizePalm} with every
 * parameter pinned (cv1): EXIF-upright decode → IMAGE-mode landmark detection → similarity warp
 * anchored on wrist(0)→middle-MCP(9) into a fixed 1536×1536 frame → deterministic CLAHE
 * (8×8 tiles, clip 2.0, luma-only) → JPEG q85.
 */
export interface CanonicalPalm {
  /** Absolute path (no `file://` scheme) of the canonical 1536×1536 JPEG in the app cache dir. */
  filePath: string;
  /** The 21 landmarks re-projected into the canonical crop, normalized [0,1]. */
  landmarks: HandPoint[];
  /** MediaPipe handedness of the detected hand ("Left" | "Right"). */
  handedness: string;
  /** Handedness confidence [0,1]. */
  confidence: number;
}

/** Creates {@linkcode HandLandmarker}s (registered Nitro hybrid: `HandLandmarkerFactory`). */
export interface HandLandmarkerFactory extends HybridObject<{ android: 'kotlin' }> {
  /** A standalone landmarker for on-demand `detect()` calls (e.g. a captured still). */
  createHandLandmarker(options?: HandLandmarkerOptions): HandLandmarker;
  /**
   * A VisionCamera {@linkcode CameraOutput} that runs the landmarker natively on every camera
   * frame (its own ImageAnalysis use case + executor — no frames ever cross into JS) and
   * delivers {@linkcode HandFrameResult}s via {@linkcode HandLandmarkerOutputOptions.onHands}.
   */
  createHandLandmarkerOutput(options: HandLandmarkerOutputOptions): CameraOutput;
  /**
   * Canonicalize a captured/picked palm photo into the pinned cv1 frame (P4.T3) — see
   * {@linkcode CanonicalPalm}. Rejects when no hand is detected in the still (callers fall back
   * to uploading the raw image with `capture_meta.cv = 'none'`).
   */
  canonicalizePalm(filePath: string): Promise<CanonicalPalm>;
  /**
   * Canonicalize a photo from a KNOWN region (the face path, P4.T5 — the region comes from the
   * live face-detector frame at shutter time): EXIF-upright decode → square crop centered at
   * (`centerX`,`centerY`) (normalized upright coords) with side `sizeFraction` ×
   * min(width, height) → 1536×1536 → the same pinned CLAHE → JPEG q85. Returns the new
   * absolute path.
   */
  canonicalizeRegion(filePath: string, centerX: number, centerY: number, sizeFraction: number): Promise<string>;
}
