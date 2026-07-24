import type { ReactNode } from 'react';
import type { CaptureState } from './capture';

/**
 * The §2.3 guidance tolerances (P4.T2), applied to the raw `CaptureQuality` measurements the
 * palm-landmarks module reports per frame. Spec-silent numbers were calibrated against the live
 * P2 bench readings on the S20+ (docs/checkpoints/p2-quality.md):
 * - a relaxed flat palm read tilt ≈ 3-30° (landmark-z noise), so the spec's 12° trigger would
 *   nag constantly — relaxed to 28° (Decision Log 2026-07-24).
 * - flat palms read flatness 0.044-0.079, visibly bent 0.096-0.124 → 0.095.
 * - bbox: arm's-length palm ≈ 35%, guide-filling ≈ 50-60%, "crammed" ≥ 70% (where tracking
 *   churns) → far < 20%, close > 62%.
 * - ambient exposure read 34-40%, covered 1% → dark < 20%; > 93% ≈ blown out/glare.
 */
export const CAPTURE_TOLERANCES = {
  bboxFar: 0.2,
  bboxClose: 0.62,
  tiltMaxDeg: 28,
  flatMax: 0.095,
  darkBelow: 0.2,
  glareAbove: 0.93,
  /** Consecutive agreeing frames before the instruction switches (anti-flicker, ~200ms @15fps). */
  voteFrames: 3,
  /** §2.3: the gold ring fills over 800ms of held tolerances, then auto-capture fires. */
  readyHoldMs: 800,
} as const;

/**
 * §2.3 review step: a HIGH-QUALITY capture (shutter pressed from `ready`, canonicalization
 * succeeded) auto-advances to upload after 2s — borderline captures block for a manual decision.
 * Distinct from the removed auto-CAPTURE (user decision 2026-07-24): the user already pressed
 * the shutter; this only saves the confirm tap, visibly and cancellably (Retake stops it).
 */
export const REVIEW_AUTO_ADVANCE_MS = 2000;

/**
 * Face-variant guidance tolerances (P4.T5, §2.3 "oval guide + Euler-angle prompts"). PROVISIONAL
 * pending the on-device calibration pass (same protocol as the palm tolerances above): width
 * fractions are face-bounds ÷ window width from the detector's autoMode coords; angles are the
 * ML Kit head Euler angles the P2.T5 bench proved live (16.8–19.5fps).
 */
export const FACE_TOLERANCES = {
  /** Face bounds narrower than this fraction of the window → "move closer". */
  widthFar: 0.32,
  /** Wider than this → "a little further". */
  widthClose: 0.78,
  /** |yaw| or |pitch| beyond this → "face the camera straight on". */
  eulerMaxDeg: 15,
  /** Face center may drift this fraction of the window from the oval center before "center your face". */
  centerSlack: 0.18,
} as const;

/**
 * The pinned cv1 FACE canonical region (P4.T3/T5): the §2.3 gate guarantees the face is centered
 * in the oval at shutter time, so a FIXED generous center crop is deterministic across repeat
 * scans without depending on per-frame detector coords (whose coordinate space the detector
 * library does not expose for stills). Part of the cv contract — changing it is a cv2.
 */
export const FACE_CANONICAL_REGION = { centerX: 0.5, centerY: 0.42, sizeFraction: 0.9 } as const;

/** What the capture screen renders right now (same gate contract as the Phase-1 engine). */
export type CaptureGate = 'standin' | 'pending' | 'live' | 'ask_again' | 'blocked';

/**
 * The platform-split guided-capture engine contract (P4.T2). The native implementation
 * (`useGuidedCapture.native.tsx`) drives VisionCamera + the palm-landmarks CameraOutput through
 * the §2.3 state machine with auto-capture; the web stub (`useGuidedCapture.ts`) keeps the
 * device-free stand-in walk. The split exists because react-native-vision-camera initializes
 * Nitro objects at import time, which would crash the SSG web export (the device-free
 * screenshot-verify path for all UI).
 */
export interface GuidedCapture {
  gate: CaptureGate;
  state: CaptureState;
  /** The live camera element (or undefined on web/stand-in) — render full-bleed as the feed. */
  feed: ReactNode | undefined;
  /** Frozen captured frame (file:// URI) during review. */
  capturedUri: string | null;
  /** The 21 landmarks in SCREEN-SPACE pixels, for the faint §2.3 skeleton overlay. */
  landmarks: [number, number][] | undefined;
  torchOn: boolean;
  toggleTorch: () => void;
  onShutter: () => void;
  onRetake: () => void;
  onConfirm: () => void;
  /** §2.3 review auto-advance is armed (high-quality capture) — the view shows the 2s fill. */
  autoAdvancing: boolean;
  uploading: boolean;
  displayError: string | null;
  retryPermission: () => Promise<void> | void;
  pickAndUpload: () => Promise<void> | void;
}
