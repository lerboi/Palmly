import type { CameraOutput } from 'react-native-vision-camera';
import type { HybridObject } from 'react-native-nitro-modules';
import type { HandFrameResult, HandLandmarker } from './HandLandmarker.nitro';

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
   * Compute delegate. GPU is the Backend §2.2 default; CPU is the diagnostics fallback.
   * @default 'gpu'
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
}
