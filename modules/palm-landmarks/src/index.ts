import { useMemo, useRef } from 'react';
import { NitroModules } from 'react-native-nitro-modules';
import type { CameraOutput } from 'react-native-vision-camera';
import type { HandLandmarker } from './specs/HandLandmarker.nitro';
import type {
  CanonicalPalm,
  HandLandmarkerFactory,
  HandLandmarkerOptions,
  HandLandmarkerOutputOptions,
} from './specs/HandLandmarkerFactory.nitro';

export type {
  CaptureQuality,
  HandDetection,
  HandFrameResult,
  HandLandmarker,
  HandPoint,
} from './specs/HandLandmarker.nitro';
export type {
  CanonicalPalm,
  HandDelegate,
  HandLandmarkerOptions,
  HandLandmarkerOutputOptions,
} from './specs/HandLandmarkerFactory.nitro';

let factory: HandLandmarkerFactory | undefined;
function getFactory(): HandLandmarkerFactory {
  factory ??= NitroModules.createHybridObject<HandLandmarkerFactory>('HandLandmarkerFactory');
  return factory;
}

/** Create a standalone {@linkcode HandLandmarker} for on-demand `detect()` calls. */
export function createHandLandmarker(options?: HandLandmarkerOptions): HandLandmarker {
  return getFactory().createHandLandmarker(options ?? {});
}

/**
 * Create a VisionCamera {@linkcode CameraOutput} that runs the MediaPipe HandLandmarker natively
 * on every camera frame and reports results through `onHands`.
 */
export function createHandLandmarkerOutput(options: HandLandmarkerOutputOptions): CameraOutput {
  return getFactory().createHandLandmarkerOutput(options);
}

/** Strip the `file://` scheme RN image URIs carry — the native layer wants a plain path. */
const toPath = (uri: string) => uri.replace(/^file:\/\//, '');

/**
 * Canonicalize a captured/picked palm photo into the pinned cv1 extraction frame (P4.T3):
 * still-image landmark detection → wrist/middle-MCP–anchored similarity warp → 1536×1536 →
 * deterministic CLAHE → JPEG q85. Accepts a path or `file://` URI. Rejects when no hand is
 * detected — callers fall back to the raw image (`capture_meta.cv = 'none'`).
 */
export function canonicalizePalm(uri: string): Promise<CanonicalPalm> {
  return getFactory().canonicalizePalm(toPath(uri));
}

/**
 * Canonicalize a photo from a known region (the face path): square crop centered at
 * (`centerX`,`centerY`) (normalized upright coords), side `sizeFraction` × min(w,h) → 1536×1536
 * → CLAHE → JPEG q85. Returns the new absolute path.
 */
export function canonicalizeRegion(uri: string, centerX: number, centerY: number, sizeFraction: number): Promise<string> {
  return getFactory().canonicalizeRegion(toPath(uri), centerX, centerY, sizeFraction);
}

/**
 * Use a hand-landmark {@linkcode CameraOutput} in a component:
 *
 * ```tsx
 * const output = useHandLandmarkerOutput({
 *   onHands(result) { ... },  // ≈ landmarker fps
 * });
 * return <Camera device="back" isActive outputs={[output]} />;
 * ```
 *
 * The output instance is stable for the component's lifetime; the latest `onHands`/`onError`
 * callbacks are always used (stable-ref pattern), so inline closures are fine.
 */
export function useHandLandmarkerOutput({
  onHands,
  onError,
  ...options
}: Partial<HandLandmarkerOutputOptions> & Pick<HandLandmarkerOutputOptions, 'onHands'>): CameraOutput {
  const stableOnHands = useRef(onHands);
  stableOnHands.current = onHands;
  const stableOnError = useRef(onError);
  stableOnError.current = onError;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- construction-time config
  return useMemo(
    () =>
      createHandLandmarkerOutput({
        ...options,
        onHands: (result) => stableOnHands.current(result),
        onError: (message) => stableOnError.current?.(message),
      }),
    [],
  );
}
