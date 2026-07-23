import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import Svg, { Circle, G, Line } from 'react-native-svg';
import { useHandLandmarkerOutput, type HandFrameResult } from 'palm-landmarks';

/**
 * /dev/landmarks — the P2 native-spike bench (device-only).
 *
 * VisionCamera V5 live preview + the palm-landmarks native CameraOutput: MediaPipe HandLandmarker
 * (VIDEO mode, GPU delegate) runs on every camera frame natively — frames never cross into JS,
 * only landmark results arrive via `onHands` — and the 21-point skeleton is drawn over the
 * preview. CameraX KEEP_ONLY_LATEST backpressure means the `onHands` rate ≈ the landmarker's
 * true sustained fps, so the HUD fps IS the P2.T2 ≥15fps verification number. Everything is
 * logged to logcat under `[P2]` for Build Log evidence.
 */
export default function DevLandmarks() {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.center}>
        <Text style={styles.note}>The P2 spike bench is device-only — open this on Android.</Text>
      </View>
    );
  }
  // Native-only from here down; the platform never changes at runtime.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useNative();
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

  const device = useCameraDevice('back');
  const { width: viewW, height: viewH } = useWindowDimensions();

  const [result, setResult] = useState<HandFrameResult | null>(null);
  const counters = useRef({ results: 0, errors: 0, lastError: '', inferMs: 0 });

  const output = useHandLandmarkerOutput({
    onHands(res) {
      const c = counters.current;
      c.results += 1;
      c.inferMs = res.inferenceTimeMs;
      if (c.results % 30 === 1) {
        console.log(
          `[P2] result #${c.results} hands=${res.hands.length} infer=${res.inferenceTimeMs.toFixed(1)}ms ${res.width}×${res.height}`,
        );
      }
      setResult(res);
    },
    onError(message) {
      const c = counters.current;
      c.errors += 1;
      c.lastError = message;
      if (c.errors === 1) console.log(`[P2] detect ERROR: ${message}`);
    },
  });

  const [hud, setHud] = useState({ fps: 0, results: 0, errors: 0, err: '', infer: 0, secs: 0 });
  const startedAt = useRef(0);
  const lastSample = useRef({ t: 0, results: 0 });
  useEffect(() => {
    startedAt.current = Date.now();
    lastSample.current = { t: Date.now(), results: 0 };
    const id = setInterval(() => {
      const now = Date.now();
      const c = counters.current;
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
        outputs={[output]}
        onStarted={() => console.log('[P2] session STARTED')}
        onStopped={() => console.log('[P2] session STOPPED')}
        onError={(e: unknown) => console.log(`[P2] session ERROR: ${String(e)}`)}
        onConfigured={() => console.log('[P2] session CONFIGURED')}
        onPreviewStarted={() => console.log('[P2] preview STARTED')}
        onPreviewStopped={() => console.log('[P2] preview STOPPED')}
      />
      {result != null && scale > 0 && (
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
        <Text style={styles.hudLine}>P2 · landmark bench</Text>
        <Text style={styles.hudBig}>{hud.fps} fps</Text>
        <Text style={styles.hudLine}>
          hands {result?.hands.length ?? 0}
          {result?.hands[0] ? ` · ${result.hands[0].handedness} ${Math.round(result.hands[0].confidence * 100)}%` : ''}
        </Text>
        <Text style={styles.hudLine}>infer {hud.infer}ms · results {hud.results}</Text>
        <Text style={styles.hudLine}>errors {hud.errors}</Text>
        <Text style={styles.hudLine}>t = {hud.secs}s</Text>
        {hud.err !== '' && <Text style={styles.hudErr} numberOfLines={3}>{hud.err}</Text>}
      </View>
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
});
