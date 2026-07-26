import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { useHandLandmarkerOutput, type HandFrameResult } from 'palm-landmarks';
import { captureError } from '@/lib/analytics';
import { CAPTURE_TOLERANCES } from '@/features/capture/guidedCapture';
import type { StoredHandSignature } from '@/lib/readings';
import type { SealCheckIn } from './useSealCheckIn';
import { canonicalSignatureFromLive, isSamePalm } from './sealMatch';
import { MATCH_FRAMES } from './checkin';

const T = CAPTURE_TOLERANCES;

/**
 * The check-in engine (Audit-5 · 02 §6, 03 §6) — the guided-capture stack in a mode that CANNOT
 * capture.
 *
 * Read the outputs array below: `[handOutput]`. There is no `usePhotoOutput`, so there is no
 * `capturePhotoToFile` to call; there is no `useScanUpload`, so there is no upload path; nothing
 * here touches the filesystem, storage, or the network. Every frame is landmarks in memory,
 * reduced to five numbers, compared to five stored numbers, and dropped. The privacy line in the UI
 * is describing this file (02 §10.4 is a code-inspection gate, and this is what it inspects).
 *
 * Cost: zero tokens, zero requests, zero bytes. Which is why the ritual can be free forever.
 */
export function useSealCheckIn({ enrolled }: { enrolled: StoredHandSignature | null }): SealCheckIn {
  // expo-camera's hook (not VisionCamera's) because it exposes `canAskAgain`, which the soft-deny
  // vs hard-deny split needs — the same choice the capture engine makes.
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [askPhase, setAskPhase] = useState<'idle' | 'pending' | 'done'>('idle');

  const ask = useCallback(async () => {
    setAskPhase('pending');
    try {
      await requestPermission();
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

  const gate: SealCheckIn['gate'] = !permission
    ? 'pending'
    : permission.granted
      ? 'live'
      : !permission.canAskAgain
        ? 'blocked'
        : askPhase === 'done'
          ? 'ask_again'
          : 'pending';

  const [handPresent, setHandPresent] = useState(false);
  const [poseReady, setPoseReady] = useState(false);
  const [matchStreak, setMatchStreak] = useState(0);
  const [matched, setMatched] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Synchronous mirrors: state lags a frame, and the match streak must not.
  const streakRef = useRef(0);
  const matchedRef = useRef(false);

  // The ladder's clock. One interval, not a per-frame timestamp diff, so the copy advances even
  // while no hand is in frame at all (which is exactly when the hint is most needed).
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - started), 500);
    return () => clearInterval(id);
  }, []);

  const handleFrame = useCallback(
    (res: HandFrameResult) => {
      if (matchedRef.current) return; // latched — stop reading once the day is sealed
      const hand = res.hands[0];
      setHandPresent(!!hand);
      if (!hand || res.width <= 0 || res.height <= 0) {
        streakRef.current = 0;
        setMatchStreak(0);
        setPoseReady(false);
        return;
      }

      const q = res.quality;
      // The same tolerances as guided capture, minus the exposure gate: the check-in has no torch
      // control to offer, and a slightly dark frame still yields usable landmarks.
      const ready = q.bboxFraction >= T.bboxFar && q.bboxFraction <= T.bboxClose && q.palmFacing && q.tiltDeg <= T.tiltMaxDeg && q.flatness <= T.flatMax;
      setPoseReady(ready);
      if (!ready) {
        streakRef.current = 0;
        setMatchStreak(0);
        return;
      }

      // Landmarks are normalized to the frame; multiply by the frame's own dimensions FIRST so the
      // distances are aspect-correct, then let `canonicalSignatureFromLive` handle the cv1 scale.
      const pts = hand.landmarks.map((p) => [p.x * res.width, p.y * res.height] as [number, number]);
      const live = canonicalSignatureFromLive(pts);
      if (isSamePalm(live, enrolled)) {
        streakRef.current += 1;
        setMatchStreak(streakRef.current);
        if (streakRef.current >= MATCH_FRAMES) {
          matchedRef.current = true;
          setMatched(true);
        }
      } else {
        streakRef.current = 0;
        setMatchStreak(0);
      }
    },
    [enrolled],
  );

  const handOutput = useHandLandmarkerOutput({
    onHands: handleFrame,
    onError: (message) => captureError(new Error(message), { where: 'sealCheckIn.landmarker' }),
  });

  const device = useCameraDevice('back');

  // `outputs={[handOutput]}` — landmarks only. Adding a photo output here would be the one change
  // that could break the privacy promise, which is why it is called out rather than left implicit.
  const feed =
    gate === 'live' && device != null ? (
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        outputs={[handOutput]}
        onError={(e: unknown) => {
          captureError(e, { where: 'sealCheckIn.cameraSession' });
          setError('The camera didn’t start — you can seal today with a tap instead.');
        }}
      />
    ) : undefined;

  return { gate, feed, handPresent, poseReady, matchStreak, matched, elapsedMs, error, retryPermission: ask };
}
