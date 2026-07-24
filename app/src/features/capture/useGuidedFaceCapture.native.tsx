import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, useWindowDimensions } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Camera, useCameraDevice, usePhotoOutput } from 'react-native-vision-camera';
import { createFaceDetectorOutput, type Face } from 'react-native-vision-camera-face-detector';
import { captureError, track } from '@/lib/analytics';
import { type CaptureState } from './capture';
import { tryCanonicalizeFace } from './canonicalize';
import {
  CAPTURE_TOLERANCES,
  FACE_CANONICAL_REGION,
  FACE_TOLERANCES,
  REVIEW_AUTO_ADVANCE_MS,
  type CaptureGate,
  type GuidedCapture,
} from './guidedCapture';
import { useScanUpload } from './useScanUpload';

const T = FACE_TOLERANCES;

/**
 * Module-scope trampoline for the face-detector callback (the LandmarksBench pattern): the
 * native CameraOutput must never be recreated mid-session, so its `onFacesDetected` points at a
 * stable module function and the engine swaps the target in an effect. React Compiler lint
 * forbids both render-read refs and mutating state/ref boxes in effects — module-scope helper
 * functions are the sanctioned escape hatch ('use no memo' does not silence it; P2 Decision
 * Log). Singleton by design: one face-capture screen exists at a time.
 */
let activeFaceHandler: (faces: Face[]) => void = () => {};
function setActiveFaceHandler(fn: (faces: Face[]) => void): void {
  activeFaceHandler = fn;
}
function dispatchFaces(faces: Face[]): void {
  activeFaceHandler(faces);
}

/**
 * Decide which single §2.3 instruction applies to a face frame (P4.T5). Priority mirrors the
 * palm engine: no face / off-center → distance → Euler tilt → ready. `dark` has no face leg —
 * the ML Kit detector reports no exposure signal (front-camera low light degrades straight to
 * `searching`, which is honest).
 */
function deriveFaceTarget(face: Face | undefined, viewW: number, viewH: number): CaptureState {
  if (!face) return 'searching';
  const widthFrac = face.bounds.width / viewW;
  const cx = face.bounds.x + face.bounds.width / 2;
  const cy = face.bounds.y + face.bounds.height / 2;
  // Off-center reads as "Center your face in the frame" — the searching copy IS the corrective.
  if (Math.abs(cx - viewW / 2) > viewW * T.centerSlack || Math.abs(cy - viewH * 0.45) > viewH * T.centerSlack) {
    return 'searching';
  }
  if (widthFrac < T.widthFar) return 'too_far';
  if (widthFrac > T.widthClose) return 'too_close';
  if (Math.abs(face.yawAngle) > T.eulerMaxDeg || Math.abs(face.pitchAngle) > T.eulerMaxDeg) return 'tilted';
  return 'ready';
}

/**
 * The P4.T5 guided FACE capture engine — the palm engine (`useGuidedCapture.native.tsx`) with
 * the §2.3 face swaps: front camera, the ML Kit face-detector CameraOutput (P2.T5-proven),
 * Euler-angle yaw/pitch prompts instead of palm-normal tilt, no torch (front camera), and the
 * pinned fixed-region face canonicalization instead of the landmark-anchored palm warp.
 * Everything else — permission lifecycle, 3-frame vote, go-signal (NO auto-capture, user
 * decision 2026-07-24), review auto-advance, funnel analytics — matches the palm engine
 * deliberately. (Consolidating both into one parameterized core is a refactor candidate AFTER
 * both are device-verified; duplicating now protects the live-verified palm path.)
 */
export function useGuidedFaceCapture(): GuidedCapture {
  const { pickAndUpload, captureAndUpload, uploading, error: uploadError, hasCompleted } = useScanUpload({ kind: 'face' });
  const { width: viewW, height: viewH } = useWindowDimensions();

  // ── OS permission lifecycle (same as palm) ──────────────────────────────────────────────────
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
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stateRef = useRef<CaptureState>('searching');
  const frozenRef = useRef(false);
  const busyRef = useRef(false);
  const voteRef = useRef<{ candidate: CaptureState; count: number }>({ candidate: 'searching', count: 0 });
  const lastMethodRef = useRef<'auto' | 'manual'>('manual');
  const lastFaceRef = useRef<Face | null>(null);
  const metaRef = useRef<Record<string, unknown> | undefined>(undefined);

  // ── §2.3 review auto-advance (same contract as palm) ────────────────────────────────────────
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
  useEffect(() => cancelAutoAdvance, [cancelAutoAdvance]);

  const device = useCameraDevice('front');
  const photoOutput = usePhotoOutput({ quality: 0.9 });

  const transition = useCallback((next: CaptureState) => {
    if (stateRef.current === next) return;
    if (__DEV__) console.log(`[P4.face] state ${stateRef.current} → ${next}`);
    stateRef.current = next;
    setState(next);
    void Haptics.impactAsync(
      next === 'ready' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
  }, []);

  const capture = useCallback(
    async (method: 'auto' | 'manual') => {
      if (busyRef.current || frozenRef.current) return;
      if (__DEV__) console.log(`[P4.face] capture (${method})`);
      const fromReady = stateRef.current === 'ready';
      busyRef.current = true;
      frozenRef.current = true;
      stateRef.current = 'captured';
      setState('captured');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), 120);
      try {
        const file = await photoOutput.capturePhotoToFile({}, {});
        lastMethodRef.current = method;
        const rawUri = `file://${file.filePath}`;
        const canonicalUri = await tryCanonicalizeFace(rawUri, FACE_CANONICAL_REGION);
        if (__DEV__) console.log(`[P4.face] canonicalize: ${canonicalUri ? 'cv1' : 'raw fallback'}`);
        const f = lastFaceRef.current;
        metaRef.current = {
          cv: canonicalUri ? 'cv1' : 'none',
          source: 'camera',
          method,
          from_ready: fromReady,
          ...(f
            ? {
                face: {
                  yaw_deg: Number(f.yawAngle.toFixed(1)),
                  pitch_deg: Number(f.pitchAngle.toFixed(1)),
                  roll_deg: Number(f.rollAngle.toFixed(1)),
                  width_frac: Number((f.bounds.width / viewW).toFixed(3)),
                },
              }
            : {}),
        };
        setCapturedUri(canonicalUri ?? rawUri);
        stateRef.current = 'review';
        setState('review');
        if (canonicalUri && fromReady) armAutoAdvance();
      } catch (e) {
        captureError(e, { where: 'faceCapture.autoShutter' });
        frozenRef.current = false;
        stateRef.current = 'searching';
        setState('searching');
        setCameraError('The capture didn’t take — try the shutter, or upload from your library.');
      } finally {
        busyRef.current = false;
      }
    },
    [photoOutput, armAutoAdvance, viewW],
  );

  // The per-frame guidance driver, from the face detector's onFacesDetected (autoMode = window
  // coords, so tolerances compare directly against the window dimensions).
  const handleFaces = useCallback(
    (faces: Face[]) => {
      if (frozenRef.current) return;
      const face = faces[0];
      lastFaceRef.current = face ?? null;
      const candidate = deriveFaceTarget(face, viewW, viewH);
      const vote = voteRef.current;
      if (vote.candidate === candidate) vote.count += 1;
      else voteRef.current = { candidate, count: 1 };
      if (voteRef.current.count >= CAPTURE_TOLERANCES.voteFrames && stateRef.current !== candidate) {
        transition(candidate);
      }
    },
    [viewW, viewH, transition],
  );

  // Their factory in OUR stable memo (their hook memoizes on an unstable rest-object — the P2.T5
  // bench lesson); frames route through the module-scope trampoline above so the output stays
  // stable while the handler follows the latest render.
  useEffect(() => {
    setActiveFaceHandler(handleFaces);
    return () => setActiveFaceHandler(() => {});
  }, [handleFaces]);
  const faceOutput = useMemo(
    () =>
      createFaceDetectorOutput({
        cameraFacing: 'front',
        performanceMode: 'fast',
        autoMode: true,
        windowWidth: viewW,
        windowHeight: viewH,
        onFacesDetected: dispatchFaces,
        onError: (error) => captureError(new Error(String(error)), { where: 'faceCapture.detector' }),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- construction-time config
    [],
  );

  const feed =
    gate === 'live' && device != null ? (
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        outputs={[photoOutput, faceOutput]}
        onError={(e: unknown) => {
          captureError(e, { where: 'faceCapture.cameraSession' });
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
    if (capturedUri) void captureAndUpload(capturedUri, lastMethodRef.current, metaRef.current);
    else void pickAndUpload();
  }, [capturedUri, captureAndUpload, pickAndUpload, cancelAutoAdvance]);

  useEffect(() => {
    confirmRef.current = onConfirm;
  }, [onConfirm]);

  // ── Capture-funnel timing (A7) — same shape as palm. ────────────────────────────────────────
  const enteredAt = useRef(0);
  const prevState = useRef<CaptureState>('searching');
  const mountedAt = useRef(0);
  useEffect(() => {
    const now = Date.now();
    enteredAt.current = now;
    mountedAt.current = now;
    return () => {
      if (!hasCompleted()) {
        track('capture_abandoned', { kind: 'face', last_state: stateRef.current, duration_ms: Date.now() - mountedAt.current });
      }
    };
  }, [hasCompleted]);
  useEffect(() => {
    if (state === prevState.current) return;
    track('capture_state_dwell', { kind: 'face', state: prevState.current, ms: Date.now() - enteredAt.current });
    prevState.current = state;
    enteredAt.current = Date.now();
  }, [state]);

  return {
    gate,
    state,
    feed,
    capturedUri,
    landmarks: undefined, // no skeleton overlay for faces — the oval guide is the §2.3 signal
    torchOn: false, // front camera has no torch
    toggleTorch: () => {},
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
