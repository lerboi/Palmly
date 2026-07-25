import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, useWindowDimensions } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Camera, useCameraDevice, usePhotoOutput } from 'react-native-vision-camera';
import { useHandLandmarkerOutput, type CaptureQuality, type HandFrameResult } from 'palm-landmarks';
import { captureError, track } from '@/lib/analytics';
import { type Hand, type ScanKind } from '@/lib/scan';
import { type CaptureState } from './capture';
import { tryCanonicalizePalm } from './canonicalize';
import { CAPTURE_TOLERANCES, REVIEW_AUTO_ADVANCE_MS, type CaptureGate, type GuidedCapture } from './guidedCapture';
import { useScanUpload } from './useScanUpload';

const T = CAPTURE_TOLERANCES;

/**
 * Decide which single §2.3 instruction applies to a frame (one at a time, never stacked).
 * Priority: no hand → dark (a bad exposure makes every other measurement unreliable, and the
 * torch control is the fix) → distance → facing/tilt → flatness → ready.
 */
function deriveTarget(res: HandFrameResult): CaptureState {
  const hand = res.hands[0];
  const q = res.quality;
  if (!hand) return 'searching';
  if (q.exposure < T.darkBelow || q.exposure > T.glareAbove) return 'dark';
  if (q.bboxFraction < T.bboxFar) return 'too_far';
  if (q.bboxFraction > T.bboxClose) return 'too_close';
  if (!q.palmFacing || q.tiltDeg > T.tiltMaxDeg) return 'tilted';
  if (q.flatness > T.flatMax) return 'not_flat';
  return 'ready';
}

/**
 * The Phase-2 guided-capture engine (P4.T2, UIUX §2.3): VisionCamera V5 + the palm-landmarks
 * native CameraOutput drive the guidance state machine — landmark quality signals vote a frame
 * candidate (3 consecutive frames to switch, anti-flicker), `ready` held for 800ms fires
 * auto-capture (photo → review), the manual shutter stays as the fallback from any state.
 * Permission lifecycle, §2.3 haptics vocabulary, funnel analytics, and the upload chain carried
 * over from the Phase-1 engine (`useLiveCapture`, deleted at P4.T5 once the face screen moved to
 * `useGuidedFaceCapture`). Returns the ready-to-render `feed` element so screens never import
 * VisionCamera (web-export safety — see `guidedCapture.ts`).
 */
export function useGuidedCapture({ kind, hand }: { kind: ScanKind; hand?: Hand }): GuidedCapture {
  const { pickAndUpload, captureAndUpload, uploading, error: uploadError, hasCompleted } = useScanUpload({ kind, hand });
  const { width: viewW, height: viewH } = useWindowDimensions();

  // ── OS permission lifecycle (same funnel-honest semantics as Phase 1) ──────────────────────
  // expo-camera's hook (not VisionCamera's) because it exposes `canAskAgain`, which the
  // soft-deny vs hard-deny recovery split needs. Both read the same OS permission.
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [askPhase, setAskPhase] = useState<'idle' | 'pending' | 'done'>('idle');

  const ask = useCallback(async () => {
    setAskPhase('pending');
    try {
      const res = await requestPermission();
      track('permission_result', { granted: res.granted, kind: 'camera' });
    } finally {
      setAskPhase('done');
    }
  }, [requestPermission]);

  const askedRef = useRef(false);
  useEffect(() => {
    if (!permission || permission.granted || !permission.canAskAgain || askedRef.current) return;
    askedRef.current = true;
    void ask();
  }, [permission, ask]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void getPermission();
    });
    return () => sub.remove();
  }, [getPermission]);

  const gate: CaptureGate = !permission
    ? 'pending'
    : permission.granted
      ? 'live'
      : !permission.canAskAgain
        ? 'blocked'
        : askPhase === 'done'
          ? 'ask_again'
          : 'pending';

  // ── Guidance state machine ──────────────────────────────────────────────────────────────────
  const [state, setState] = useState<CaptureState>('searching');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<[number, number][] | undefined>(undefined);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Synchronous mirrors for the per-frame path (state lags a frame; these don't).
  const stateRef = useRef<CaptureState>('searching');
  const frozenRef = useRef(false); // captured/review — guidance frames are ignored
  const busyRef = useRef(false);
  const voteRef = useRef<{ candidate: CaptureState; count: number }>({ candidate: 'searching', count: 0 });
  // How the frame under review was acquired — carried into `capture_completed` at upload (A7).
  // (Always 'manual' since the 2026-07-24 no-auto-capture decision; kept for the funnel schema.)
  const lastMethodRef = useRef<'auto' | 'manual'>('manual');
  // The last frame's raw quality signals + the P4.T3 capture_meta stamp for the frame under review.
  const lastQualityRef = useRef<CaptureQuality | null>(null);
  const metaRef = useRef<Record<string, unknown> | undefined>(undefined);

  // ── §2.3 review auto-advance (P4.T3): armed only for high-quality captures ─────────────────
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmRef = useRef<() => void>(() => {});
  const cancelAutoAdvance = useCallback(() => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    setAutoAdvancing(false);
  }, []);
  const armAutoAdvance = useCallback(() => {
    setAutoAdvancing(true);
    autoTimerRef.current = setTimeout(() => {
      autoTimerRef.current = null;
      setAutoAdvancing(false);
      confirmRef.current();
    }, REVIEW_AUTO_ADVANCE_MS);
  }, []);
  useEffect(() => cancelAutoAdvance, [cancelAutoAdvance]); // never fire past unmount

  const device = useCameraDevice('back');
  const photoOutput = usePhotoOutput({ quality: 0.9 });

  const transition = useCallback((next: CaptureState) => {
    if (stateRef.current === next) return;
    if (__DEV__) console.log(`[P4] state ${stateRef.current} → ${next}`);
    stateRef.current = next;
    setState(next);
    // §2.3 haptic vocabulary: a light tick per state change — and a firmer tap on entering
    // `ready`, the "now's the moment, press the shutter" nudge (no auto-capture).
    void Haptics.impactAsync(
      next === 'ready' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
  }, []);

  const capture = useCallback(
    async (method: 'auto' | 'manual') => {
      if (busyRef.current || frozenRef.current) return;
      if (__DEV__) console.log(`[P4] capture (${method})`);
      // Whether the shutter was pressed inside tolerances — the §2.3 "quality score is high"
      // signal that arms the review auto-advance (borderline captures block for a manual look).
      const fromReady = stateRef.current === 'ready';
      busyRef.current = true;
      frozenRef.current = true;
      stateRef.current = 'captured';
      setState('captured');
      // §2.3 capture haptic: a double tap.
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), 120);
      try {
        const file = await photoOutput.capturePhotoToFile({}, {});
        lastMethodRef.current = method;
        const rawUri = `file://${file.filePath}`;
        // P4.T3: warp the still into the pinned cv1 extraction frame. Falls back to the raw
        // photo (cv:'none') if the still shows no detectable hand — the pipeline still works,
        // it just loses the determinism/consistency benefits for this one scan.
        const canonical = kind === 'palm' ? await tryCanonicalizePalm(rawUri) : null;
        if (__DEV__) console.log(`[P4] canonicalize: ${canonical ? 'cv1' : 'raw fallback'}`);
        const q = lastQualityRef.current;
        metaRef.current = {
          cv: canonical ? 'cv1' : 'none',
          source: 'camera',
          method,
          from_ready: fromReady,
          // Subject-identity signature (§6.6 item 3) — the worker matches on this BEFORE paying
          // for extraction (the true "same hand → stored reading" fast path).
          ...(canonical?.handGeometry ? { hand_geometry: canonical.handGeometry } : {}),
          ...(q
            ? {
                quality: {
                  bbox: Number(q.bboxFraction.toFixed(3)),
                  tilt_deg: Number(q.tiltDeg.toFixed(1)),
                  flatness: Number(q.flatness.toFixed(3)),
                  exposure: Number(q.exposure.toFixed(2)),
                },
              }
            : {}),
        };
        setCapturedUri(canonical?.uri ?? rawUri);
        setLandmarks(undefined);
        stateRef.current = 'review';
        setState('review');
        // §2.3: high-quality captures auto-advance after 2s; Retake (or confirm) cancels.
        if (canonical && fromReady) armAutoAdvance();
      } catch (e) {
        captureError(e, { where: `${kind}Capture.autoShutter` });
        frozenRef.current = false;
        stateRef.current = 'searching';
        setState('searching');
        setCameraError('The capture didn’t take — try the shutter, or upload from your library.');
      } finally {
        busyRef.current = false;
      }
    },
    [kind, photoOutput, armAutoAdvance],
  );

  // The per-frame guidance driver: ~15fps on the JS thread, from the landmarker's onHands.
  const handleFrame = useCallback(
    (res: HandFrameResult) => {
      if (frozenRef.current) return;
      lastQualityRef.current = res.quality; // the P4.T3 capture_meta stamp reads the shutter-time frame

      // Map normalized upright-frame landmarks onto the cover-fitted, centered preview
      // (screen-space px for the CaptureView skeleton overlay).
      const hand0 = res.hands[0];
      if (hand0 && res.width > 0 && res.height > 0) {
        const scale = Math.max(viewW / res.width, viewH / res.height);
        const offsetX = (res.width * scale - viewW) / 2;
        const offsetY = (res.height * scale - viewH) / 2;
        setLandmarks(hand0.landmarks.map((p) => [p.x * res.width * scale - offsetX, p.y * res.height * scale - offsetY]));
      } else {
        setLandmarks(undefined);
      }

      // Vote: a state switch needs `voteFrames` consecutive agreeing frames (anti-flicker).
      // No auto-capture (user product decision 2026-07-24, amending §2.3): `ready` is a GO
      // SIGNAL — the UI lights up and the user takes the photo themselves with the shutter.
      const candidate = deriveTarget(res);
      const vote = voteRef.current;
      if (vote.candidate === candidate) vote.count += 1;
      else voteRef.current = { candidate, count: 1 };
      if (voteRef.current.count >= T.voteFrames && stateRef.current !== candidate) {
        transition(candidate);
      }
    },
    [viewW, viewH, transition],
  );

  const handOutput = useHandLandmarkerOutput({
    onHands: handleFrame,
    onError: (message) => {
      captureError(new Error(message), { where: `${kind}Capture.landmarker` });
    },
  });

  // ── The feed element (screens render it; they never import VisionCamera) ───────────────────
  const feed =
    gate === 'live' && device != null ? (
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        outputs={[photoOutput, handOutput]}
        torchMode={torchOn ? 'on' : 'off'}
        onError={(e: unknown) => {
          captureError(e, { where: `${kind}Capture.cameraSession` });
          setCameraError('The camera didn’t start — you can upload from your library instead.');
        }}
      />
    ) : undefined;

  const onRetake = useCallback(() => {
    cancelAutoAdvance();
    metaRef.current = undefined;
    setCapturedUri(null);
    setCameraError(null);
    frozenRef.current = false;
    voteRef.current = { candidate: 'searching', count: 0 };
    stateRef.current = 'searching';
    setState('searching');
  }, [cancelAutoAdvance]);

  const onConfirm = useCallback(() => {
    cancelAutoAdvance();
    // A captured frame uploads directly; without one (shouldn't happen in review) fall back to
    // the library pick so confirm still reaches /analyzing with a real scanId (audit A5).
    if (capturedUri) void captureAndUpload(capturedUri, lastMethodRef.current, metaRef.current);
    else void pickAndUpload();
  }, [capturedUri, captureAndUpload, pickAndUpload, cancelAutoAdvance]);

  // The auto-advance timer confirms through a ref so the armed timeout always runs the LATEST
  // confirm (capturedUri lands after the timer is armed).
  useEffect(() => {
    confirmRef.current = onConfirm;
  }, [onConfirm]);

  const toggleTorch = useCallback(() => setTorchOn((t) => !t), []);

  // ── Capture-funnel timing (A7) — dwell per state; abandoned on unmount unless completed. ────
  const enteredAt = useRef(0);
  const prevState = useRef<CaptureState>('searching');
  const mountedAt = useRef(0);
  useEffect(() => {
    const now = Date.now();
    enteredAt.current = now;
    mountedAt.current = now;
    return () => {
      if (!hasCompleted()) {
        track('capture_abandoned', { kind, last_state: stateRef.current, duration_ms: Date.now() - mountedAt.current });
      }
    };
  }, [kind, hasCompleted]);
  useEffect(() => {
    if (state === prevState.current) return;
    track('capture_state_dwell', { kind, state: prevState.current, ms: Date.now() - enteredAt.current });
    prevState.current = state;
    enteredAt.current = Date.now();
  }, [kind, state]);

  return {
    gate,
    state,
    feed,
    capturedUri,
    landmarks,
    torchOn,
    toggleTorch,
    onShutter: () => void capture('manual'),
    onRetake,
    onConfirm,
    autoAdvancing,
    uploading,
    displayError: uploadError ?? cameraError,
    retryPermission: ask,
    pickAndUpload,
  };
}
