import { useMemo, useRef } from 'react';
import { NitroModules } from 'react-native-nitro-modules';
import type { CameraOutput } from 'react-native-vision-camera';
import type { HandLandmarker } from './specs/HandLandmarker.nitro';
import type {
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
