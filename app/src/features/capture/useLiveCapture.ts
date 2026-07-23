import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useCameraPermissions, type CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { captureError, track } from '@/lib/analytics';
import { type Hand, type ScanKind } from '@/lib/scan';
import { type CaptureState } from './capture';
import { useScanUpload } from './useScanUpload';

/**
 * What the capture screen should render right now:
 * - `standin`  — web / device-free: the flat feed stand-in + faked shutter choreography.
 * - `pending`  — permission still resolving, or the OS prompt is up: stand-in behind the dialog.
 * - `live`     — granted: mount the real CameraView.
 * - `ask_again`— soft-denied (OS can re-prompt): recovery view with a re-ask CTA.
 * - `blocked`  — hard-denied ("never ask again"): recovery view deep-linking to Settings.
 */
export type CaptureGate = 'standin' | 'pending' | 'live' | 'ask_again' | 'blocked';

/**
 * The shared live-capture engine behind palm + face (UIUX §2.3, Phase 1 — real camera, manual
 * shutter). Owns the OS permission lifecycle (request at the moment of intent, honest
 * `permission_result` analytics, AppState re-check so granting in Settings is noticed), the real
 * §2.3 state semantics Phase 1 can back with true signals (`searching` until the preview is live →
 * `ready` — per the SDK, `takePictureAsync` must wait for `onCameraReady`), the §2.3 haptic
 * vocabulary (light tick on ready, double tap on capture), the freeze-frame → review → upload
 * choreography (preview pauses under the frozen frame; retake resumes instantly), and the torch
 * (the Phase-1 stand-in for the `dark` exposure guidance). The landmark-driven corrective states +
 * auto-capture remain Phase 2.
 *
 * Screens own the JSX: mount a `CameraView` with {@link cameraRef} + the returned callbacks when
 * `gate === 'live'`, overlay the frozen `capturedUri` during review, and route `ask_again`/`blocked`
 * to the denied-recovery view. Web (`standin`) keeps the device-free walk: fake shutter → review →
 * confirm falls back to the library picker (never an id-less /analyzing push, audit A5).
 */
export function useLiveCapture({ kind, hand }: { kind: ScanKind; hand?: Hand }) {
  const isNative = Platform.OS !== 'web';
  const { pickAndUpload, captureAndUpload, uploading, error: uploadError, hasCompleted } = useScanUpload({ kind, hand });

  // ── OS permission lifecycle ─────────────────────────────────────────────────────────────────
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [askPhase, setAskPhase] = useState<'idle' | 'pending' | 'done'>('idle');

  // The one funnel-honest place to emit `permission_result`: when the OS actually answers (the
  // primer used to log granted:true before any prompt existed — a fabricated grant rate).
  const ask = useCallback(async () => {
    setAskPhase('pending');
    try {
      const res = await requestPermission();
      track('permission_result', { granted: res.granted, kind: 'camera' });
    } finally {
      setAskPhase('done');
    }
  }, [requestPermission]);

  // Request at the moment of intent — once, when the loaded permission is still undetermined/soft-
  // denied. Hard-denied skips straight to the Settings recovery (re-asking is an instant no).
  const askedRef = useRef(false);
  useEffect(() => {
    if (!isNative || !permission || permission.granted || !permission.canAskAgain || askedRef.current) return;
    askedRef.current = true;
    void ask();
  }, [isNative, permission, ask]);

  // Returning from system Settings does NOT re-run the permission hook — re-read on foreground so
  // "user granted in Settings" flips the gate to live instead of stranding them on the denied view.
  useEffect(() => {
    if (!isNative) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void getPermission();
    });
    return () => sub.remove();
  }, [isNative, getPermission]);

  const gate: CaptureGate = !isNative
    ? 'standin'
    : !permission
      ? 'pending'
      : permission.granted
        ? 'live'
        : !permission.canAskAgain
          ? 'blocked'
          : askPhase === 'done'
            ? 'ask_again'
            : 'pending';

  // ── Camera lifecycle + capture state (§2.3, real signals) ───────────────────────────────────
  // Native starts at `searching` (dashed guide, "Hold your palm up…") until the preview is truly
  // live; web keeps the device-free stand-in parked at `ready` (the harness-verified frame).
  const cameraRef = useRef<CameraView>(null);
  const [state, setState] = useState<CaptureState>(isNative ? 'searching' : 'ready');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const cameraReadyRef = useRef(false);
  const mountFailedRef = useRef(false);
  const busyRef = useRef(false);
  const stateRef = useRef<CaptureState>(isNative ? 'searching' : 'ready');

  // The SDK requires waiting for onCameraReady before takePictureAsync — this flip is also the
  // real searching → ready transition (+ the §2.3 light tick on the state change).
  const onCameraReady = useCallback(() => {
    cameraReadyRef.current = true;
    if (stateRef.current === 'searching') {
      setState('ready');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  // A camera that fails to open must not be a silent black screen: surface it, and let the shutter
  // fall through to the library picker so the flow still completes.
  const onMountError = useCallback((e: unknown) => {
    mountFailedRef.current = true;
    captureError(e, { where: `${kind}Capture.cameraMount` });
    setCameraError('The camera didn’t start — the shutter will open your library instead.');
  }, [kind]);

  const onShutter = useCallback(async () => {
    // Device-free stand-in: the faked §2.3 choreography (shutter → freeze → review).
    if (!isNative) {
      setState('captured');
      setTimeout(() => setState('review'), 500);
      return;
    }
    if (mountFailedRef.current) {
      void pickAndUpload(); // broken camera → the library door, not a dead button
      return;
    }
    if (!cameraRef.current || !cameraReadyRef.current || busyRef.current) return; // pre-ready taps are no-ops
    busyRef.current = true;
    setState('captured');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        // §2.3 capture haptic: a double tap.
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), 120);
        setCapturedUri(photo.uri);
        setState('review');
        // The frozen frame covers the preview — pause it (battery); retake resumes instantly.
        void cameraRef.current.pausePreview().catch(() => {});
      } else {
        setState('ready');
      }
    } catch (e) {
      captureError(e, { where: `${kind}Capture.shutter` });
      setState('ready');
    } finally {
      busyRef.current = false;
    }
  }, [isNative, kind, pickAndUpload]);

  const onRetake = useCallback(() => {
    setCapturedUri(null);
    setState(!isNative || cameraReadyRef.current ? 'ready' : 'searching');
    void cameraRef.current?.resumePreview().catch(() => {});
  }, [isNative]);

  const onConfirm = useCallback(() => {
    // A captured frame uploads directly; the stand-in (no frame) falls back to the library pick so
    // confirm still reaches /analyzing with a real scanId (audit A5).
    if (capturedUri) void captureAndUpload(capturedUri);
    else void pickAndUpload();
  }, [capturedUri, captureAndUpload, pickAndUpload]);

  const toggleTorch = useCallback(() => setTorchOn((t) => !t), []);

  // ── Capture-funnel timing (A7) — dwell per state; abandoned on unmount unless completed. ─────
  const enteredAt = useRef(0);
  const prevState = useRef<CaptureState>(isNative ? 'searching' : 'ready');
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
    stateRef.current = state;
    if (state === prevState.current) return;
    track('capture_state_dwell', { kind, state: prevState.current, ms: Date.now() - enteredAt.current });
    prevState.current = state;
    enteredAt.current = Date.now();
  }, [kind, state]);

  return {
    gate,
    state,
    capturedUri,
    cameraRef,
    onCameraReady,
    onMountError,
    onShutter,
    onRetake,
    onConfirm,
    torchOn,
    toggleTorch,
    uploading,
    /** Upload failures + camera-mount failures, for the screen's error toast (first wins). */
    displayError: uploadError ?? cameraError,
    /** Re-ask CTA for the soft-denied recovery view. */
    retryPermission: ask,
    /** The always-available library fallback (denied recovery, broken camera). */
    pickAndUpload,
  };
}
