import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';
import { useHandLandmarkerOutput, type HandFrameResult } from 'palm-landmarks';
import {
  createFaceDetectorOutput,
  type Face,
} from 'react-native-vision-camera-face-detector';

/**
 * The P2 native-spike bench body (device-only; route: /dev/landmarks).
 *
 * VisionCamera V5 live preview + the palm-landmarks native CameraOutput: MediaPipe HandLandmarker
 * (VIDEO mode, GPU delegate) runs on every camera frame natively — frames never cross into JS,
 * only landmark results arrive via `onHands` — and the 21-point skeleton is drawn over the
 * preview. CameraX KEEP_ONLY_LATEST backpressure means the `onHands` rate ≈ the landmarker's
 * true sustained fps, so the HUD fps IS the P2.T2 ≥15fps verification number. Everything is
 * logged to logcat under `[P2]` for Build Log evidence.
 */
/** The real (native) P2 bench — the `.native` half of the platform split (web gets a stub). */
export function LandmarksBench() {
  return useNative();
}

/**
 * Bench counters — a module-scope singleton (the bench is a single dev screen). All writes go
 * through the module-scope record* helpers below so no component closure mutates state the
 * React Compiler tracks; components only read via the HUD interval (event time, not render).
 */
const COUNTERS = { results: 0, errors: 0, lastError: '', inferMs: 0 };

function recordHandResult(res: HandFrameResult): void {
  COUNTERS.results += 1;
  COUNTERS.inferMs = res.inferenceTimeMs;
  if (COUNTERS.results % 30 === 1) {
    console.log(
      `[P2] result #${COUNTERS.results} hands=${res.hands.length} infer=${res.inferenceTimeMs.toFixed(1)}ms ${res.width}×${res.height}`,
    );
  }
}

function recordFaceResult(faces: Face[]): void {
  COUNTERS.results += 1;
  if (COUNTERS.results % 30 === 1) {
    const f = faces[0];
    console.log(
      `[P2.T5] result #${COUNTERS.results} faces=${faces.length}` +
        (f ? ` yaw=${f.yawAngle.toFixed(0)} pitch=${f.pitchAngle.toFixed(0)} roll=${f.rollAngle.toFixed(0)}` : ''),
    );
  }
}

function recordBenchError(message: string, tag: string): void {
  COUNTERS.errors += 1;
  COUNTERS.lastError = message;
  if (COUNTERS.errors === 1) console.log(`[${tag}] detect ERROR: ${message}`);
}

/** MediaPipe hand-skeleton bone pairs (landmark indices). */
const BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

function useNative() {
  const { hasPermission, requestPermission } = useCameraPermission();
  useEffect(() => {
    if (!hasPermission) void requestPermission();
  }, [hasPermission, requestPermission]);

  // P2.T2 bench = back camera + hand landmarker; P2.T5 bench = front camera + face detector.
  const [mode, setMode] = useState<'hand' | 'face'>('hand');
  const backDevice = useCameraDevice('back');
  const frontDevice = useCameraDevice('front');
  const device = mode === 'face' ? (frontDevice ?? backDevice) : backDevice;
  const { width: viewW, height: viewH } = useWindowDimensions();

  const [result, setResult] = useState<HandFrameResult | null>(null);
  const [face, setFace] = useState<Face | null>(null);
  // (module-scope COUNTERS: see below — a plain singleton so no ref is touched in render)

  const output = useHandLandmarkerOutput({
    onHands(res) {
      recordHandResult(res);
      setResult(res);
    },
    onError(message) {
      recordBenchError(message, 'P2');
    },
  });

  // P2.T5 face output — their factory, wrapped in OUR stable memo (their useFaceDetectorOutput
  // hook memoizes on an unstable rest-object and would recreate the native output every render,
  // and this bench re-renders per detection). autoMode pre-scales bounds to window coords.
  // `setFace` (state setter) and the module-scope COUNTERS are both stable, so the callbacks
  // capture them directly — no ref juggling needed.
  const faceOutput = useMemo(
    () =>
      createFaceDetectorOutput({
        cameraFacing: 'front',
        performanceMode: 'fast',
        autoMode: true,
        windowWidth: viewW,
        windowHeight: viewH,
        onFacesDetected(faces) {
          recordFaceResult(faces);
          setFace(faces[0] ?? null);
        },
        onError(error) {
          recordBenchError(String(error), 'P2.T5');
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- construction-time config
    [],
  );

  const [hud, setHud] = useState({ fps: 0, results: 0, errors: 0, err: '', infer: 0, secs: 0 });
  const startedAt = useRef(0);
  const lastSample = useRef({ t: 0, results: 0 });
  useEffect(() => {
    startedAt.current = Date.now();
    lastSample.current = { t: Date.now(), results: 0 };
    const id = setInterval(() => {
      const now = Date.now();
      const c = COUNTERS;
      const dt = (now - lastSample.current.t) / 1000;
      const fps = dt > 0 ? (c.results - lastSample.current.results) / dt : 0;
      lastSample.current = { t: now, results: c.results };
      const secs = Math.round((now - startedAt.current) / 1000);
      setHud({
        fps: Math.round(fps * 10) / 10,
        results: c.results,
        errors: c.errors,
        err: c.lastError,
        infer: Math.round(c.inferMs * 10) / 10,
        secs,
      });
      if (secs > 0 && secs % 5 === 0) {
        console.log(
          `[P2] t=${secs}s fps=${fps.toFixed(1)} results=${c.results} errors=${c.errors} infer=${c.inferMs.toFixed(1)}ms`,
        );
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.note}>Waiting for camera permission…</Text>
      </View>
    );
  }
  if (device == null) {
    return (
      <View style={styles.center}>
        <Text style={styles.note}>No back camera found on this device.</Text>
      </View>
    );
  }

  // Map normalized upright-frame coords onto the cover-fitted, centered preview.
  const frameW = result?.width ?? 0;
  const frameH = result?.height ?? 0;
  const scale = frameW > 0 && frameH > 0 ? Math.max(viewW / frameW, viewH / frameH) : 0;
  const offsetX = (frameW * scale - viewW) / 2;
  const offsetY = (frameH * scale - viewH) / 2;
  const px = (x: number) => x * frameW * scale - offsetX;
  const py = (y: number) => y * frameH * scale - offsetY;

  return (
    <View style={styles.root}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        outputs={mode === 'face' ? [faceOutput] : [output]}
        onStarted={() => console.log('[P2] session STARTED')}
        onStopped={() => console.log('[P2] session STOPPED')}
        onError={(e: unknown) => console.log(`[P2] session ERROR: ${String(e)}`)}
        onConfigured={() => console.log('[P2] session CONFIGURED')}
        onPreviewStarted={() => console.log('[P2] preview STARTED')}
        onPreviewStopped={() => console.log('[P2] preview STOPPED')}
      />
      {mode === 'face' && face != null && (
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Rect
            x={face.bounds.x}
            y={face.bounds.y}
            width={face.bounds.width}
            height={face.bounds.height}
            stroke="#7CFC9B"
            strokeWidth={3}
            fill="none"
          />
        </Svg>
      )}
      {mode === 'hand' && result != null && scale > 0 && (
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          {result.hands.map((hand, hi) => (
            <G key={hi}>
              {BONES.map(([a, b]) => {
                const pa = hand.landmarks[a];
                const pb = hand.landmarks[b];
                if (!pa || !pb) return null;
                return (
                  <Line
                    key={`${hi}-${a}-${b}`}
                    x1={px(pa.x)} y1={py(pa.y)} x2={px(pb.x)} y2={py(pb.y)}
                    stroke="#7CFC9B" strokeWidth={2}
                  />
                );
              })}
              {hand.landmarks.map((p, i) => (
                <Circle key={`${hi}-${i}`} cx={px(p.x)} cy={py(p.y)} r={4} fill="#FFD700" />
              ))}
            </G>
          ))}
        </Svg>
      )}
      <View style={styles.hud} pointerEvents="none">
        <Text style={styles.hudLine}>P2 · {mode === 'face' ? 'face bench (T5)' : 'landmark bench'}</Text>
        <Text style={styles.hudBig}>{hud.fps} fps</Text>
        {mode === 'hand' ? (
          <Text style={styles.hudLine}>
            hands {result?.hands.length ?? 0}
            {result?.hands[0] ? ` · ${result.hands[0].handedness} ${Math.round(result.hands[0].confidence * 100)}%` : ''}
          </Text>
        ) : (
          <Text style={styles.hudLine}>
            {face
              ? `yaw ${face.yawAngle.toFixed(0)}° · pitch ${face.pitchAngle.toFixed(0)}° · roll ${face.rollAngle.toFixed(0)}°`
              : 'no face'}
          </Text>
        )}
        <Text style={styles.hudLine}>infer {hud.infer}ms · results {hud.results}</Text>
        <Text style={styles.hudLine}>errors {hud.errors}</Text>
        <Text style={styles.hudLine}>t = {hud.secs}s</Text>
        {mode === 'hand' && result != null && (
          <>
            <Text style={styles.hudLine}>— quality (P2.T4) —</Text>
            <Text style={styles.hudLine}>
              bbox {(result.quality.bboxFraction * 100).toFixed(0)}% · tilt {result.quality.tiltDeg.toFixed(0)}°
            </Text>
            <Text style={styles.hudLine}>
              {result.quality.palmFacing ? 'palm ✓' : 'back/away'} · flat {result.quality.flatness.toFixed(3)}
            </Text>
            <Text style={styles.hudLine}>exposure {(result.quality.exposure * 100).toFixed(0)}%</Text>
          </>
        )}
        {hud.err !== '' && <Text style={styles.hudErr} numberOfLines={3}>{hud.err}</Text>}
      </View>
      <Pressable
        style={styles.modeButton}
        onPress={() => {
          setResult(null);
          setFace(null);
          setMode((m) => (m === 'hand' ? 'face' : 'hand'));
        }}
      >
        <Text style={styles.modeButtonText}>{mode === 'hand' ? 'switch to face' : 'switch to hand'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  note: { fontSize: 16, textAlign: 'center' },
  hud: {
    position: 'absolute',
    top: 60,
    left: 16,
    maxWidth: 260,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  hudBig: { color: '#7CFC9B', fontSize: 28, fontVariant: ['tabular-nums'], fontWeight: '700' },
  hudLine: { color: '#EAEAEA', fontSize: 13, fontVariant: ['tabular-nums'] },
  hudErr: { color: '#FF8888', fontSize: 12 },
  modeButton: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  modeButtonText: { color: '#EAEAEA', fontSize: 15, fontWeight: '600' },
});
