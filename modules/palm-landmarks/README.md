# palm-landmarks

Palmly's custom native module wrapping **Google MediaPipe Tasks** hand-landmark detection for
**VisionCamera V5** frames. Built in **P2** (the native landmark spike — Backend §2.2, decision D5:
no maintained off-the-shelf RN library exists, so this is the one custom-native component).

## Architecture

A [Nitro](https://nitro.margelo.com) library (nitrogen-codegen'd), modeled on
`react-native-vision-camera-face-detector` v2 (the proven V5-plugin shape):

- `src/specs/*.nitro.ts` — the typed JS↔native contract; `nitrogen` generates the C++/Kotlin glue
  into `nitrogen/generated/` (committed). Re-run `npm run specs` after editing a spec.
- `android/src/main/java/com/margelo/nitro/palmly/` — Kotlin implementation over
  `com.google.mediapipe:tasks-vision` `HandLandmarker`.
- `android/src/main/assets/hand_landmarker.task` — the MediaPipe float16 model (~7.8 MB), a
  versioned artifact committed like `prompts/`/`kb/`.
- iOS (Swift over `MediaPipeTasksVision`) is **P2.T3**, pending — compiled via EAS only
  (Windows host); `nitro.json` autolinking currently registers Android only.

**Running-mode decision (P2 Decision Log):** the spec sheet named LIVE_STREAM, but V5 decoupled
frame outputs from the preview output, so a synchronous `detectForVideo` (VIDEO mode) no longer
janks the preview. Sync detection means the frame can be `dispose()`d the moment `detect()`
returns (no buffer-lifetime hazard), every result belongs to exactly the frame that produced it
(no staleness — which the P4 canonical-crop determinism test needs), and callback fps == detector
fps (trivial to verify). GPU delegate is the default, per spec.

## API

```ts
import { useHandLandmarker, createHandLandmarker } from 'palm-landmarks';
import { useFrameOutput } from 'react-native-vision-camera';

const landmarker = useHandLandmarker({
  numHands: 1,                      // default 1
  minHandDetectionConfidence: 0.5,  // default 0.5
  minHandPresenceConfidence: 0.5,   // default 0.5
  minTrackingConfidence: 0.5,       // default 0.5
  delegate: 'gpu',                  // 'gpu' (default) | 'cpu'
});

const frameOutput = useFrameOutput({
  onFrame(frame) {
    'worklet';
    try {
      const result = landmarker.detect(frame); // synchronous
      // result.hands: [{ landmarks: HandPoint[21], handedness: 'Left'|'Right', confidence }]
      // result.width/height: upright pixel dims the normalized coords refer to
      // result.inferenceTimeMs
    } finally {
      frame.dispose();
    }
  },
});
```

- `HandPoint` — `{ x, y, z }`; `x`/`y` normalized [0,1] in the **upright** (rotation-applied)
  frame; `z` is wrist-relative depth (negative = toward camera). Landmark indices follow the
  [MediaPipe hand model](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker)
  (0 = wrist, 4 = thumb tip, 8 = index tip, …).
- `detect()` throws if the frame isn't a `NativeFrame` — call it only from a frame-output worklet.
- The dev bench lives at `/dev/landmarks` in the app (fps HUD + skeleton overlay + logcat `[P2]`
  evidence lines).

## Verified performance

_To be recorded at P2.T2 verify: device model + sustained fps over 60s._
