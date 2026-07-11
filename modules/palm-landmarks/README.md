# modules/palm-landmarks

Custom Expo native module wrapping **Google MediaPipe Tasks** for hand-landmark detection.
Built in **P2** (the native landmark spike — the highest-risk, kill/pivot decision).

- Android: Kotlin frame-processor plugin over MediaPipe `HandLandmarker` (LIVE_STREAM, GPU delegate).
- iOS: Swift wrapper over `MediaPipeTasksVision` HandLandmarker (compiled via EAS cloud builds).
- Output: 21 normalized landmarks + handedness + confidence per frame, plus a `CaptureQuality`
  signal object (palm-facing, flatness, tilt, bbox fraction, exposure) that drives the
  UIUX §2.3 capture state machine.

The public module API is documented here as part of the **P2.G** phase gate. See
`Planning/Backend-specs.md` §2.2 and `Planning/MVP_Buildplan.md` P2.
