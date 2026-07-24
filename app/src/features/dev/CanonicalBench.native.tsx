import { useState } from 'react';
import { View } from 'react-native';
import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle } from 'react-native-svg';
import { canonicalizePalm } from 'palm-landmarks';
import { Button, Card, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

interface BenchRun {
  sourceUri: string;
  canonicalUri: string;
  landmarks: [number, number][];
  handedness: string;
  deterministic: boolean | null; // null = canonicalize failed (no hand)
  bytes: number;
  ms: number;
  error?: string;
}

/** Byte-equality of two files (the P4.T3 determinism check — no hash dependency needed). */
async function sameBytes(aUri: string, bUri: string): Promise<boolean> {
  const [a, b] = await Promise.all([new File(aUri).arrayBuffer(), new File(bUri).arrayBuffer()]);
  if (a.byteLength !== b.byteLength) return false;
  const va = new Uint8Array(a);
  const vb = new Uint8Array(b);
  for (let i = 0; i < va.length; i++) if (va[i] !== vb[i]) return false;
  return true;
}

const PREVIEW = 148;

/**
 * P4.T3 determinism bench: each picked photo runs the pinned cv1 pipeline TWICE — identical
 * bytes out = the "deterministic, pinned params" contract holds through decode → still
 * detection → similarity warp → CLAHE → JPEG encode. Rows accumulate into the repeat-capture
 * contact sheet (pick 3 shots of the same palm and compare the crops by eye: wrist
 * bottom-center, palm axis vertical, same framing each time).
 */
export function CanonicalBench() {
  const theme = useTheme();
  const [runs, setRuns] = useState<BenchRun[]>([]);
  const [busy, setBusy] = useState(false);

  const runOnce = async () => {
    setBusy(true);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      const asset = picked.assets?.[0];
      if (picked.canceled || !asset) return;
      const started = Date.now();
      try {
        const first = await canonicalizePalm(asset.uri);
        const second = await canonicalizePalm(asset.uri);
        const firstUri = `file://${first.filePath}`;
        const deterministic = await sameBytes(firstUri, `file://${second.filePath}`);
        const bytes = (await new File(firstUri).arrayBuffer()).byteLength;
        setRuns((r) => [
          {
            sourceUri: asset.uri,
            canonicalUri: firstUri,
            landmarks: first.landmarks.map((p) => [p.x, p.y] as [number, number]),
            handedness: first.handedness,
            deterministic,
            bytes,
            ms: Date.now() - started,
          },
          ...r,
        ]);
      } catch (e) {
        setRuns((r) => [
          {
            sourceUri: asset.uri,
            canonicalUri: '',
            landmarks: [],
            handedness: '—',
            deterministic: null,
            bytes: 0,
            ms: Date.now() - started,
            error: String(e),
          },
          ...r,
        ]);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <Text variant="title">Canonical crop bench</Text>
      <Text variant="caption" tone="secondary" style={{ marginBottom: theme.spacing.md }}>
        P4.T3 — cv1 warp run twice per photo; PASS = byte-identical outputs
      </Text>
      <Button label={busy ? 'Working…' : 'Pick a palm photo'} onPress={() => void runOnce()} disabled={busy} fullWidth />
      <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.md }}>
        {runs.map((run, i) => (
          <Card key={`${run.canonicalUri || run.sourceUri}-${i}`}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <Image source={{ uri: run.sourceUri }} style={{ width: PREVIEW, height: PREVIEW, borderRadius: theme.radii.md }} contentFit="cover" />
              {run.canonicalUri ? (
                <View style={{ width: PREVIEW, height: PREVIEW }}>
                  <Image source={{ uri: run.canonicalUri }} style={{ width: PREVIEW, height: PREVIEW, borderRadius: theme.radii.md }} contentFit="contain" />
                  <Svg width={PREVIEW} height={PREVIEW} style={{ position: 'absolute' }} pointerEvents="none">
                    {run.landmarks.map(([x, y], j) => (
                      <Circle key={j} cx={x * PREVIEW} cy={y * PREVIEW} r={j === 0 || j === 9 ? 4 : 2} fill={j === 0 || j === 9 ? theme.colors.accent : 'rgba(255,255,255,0.8)'} />
                    ))}
                  </Svg>
                </View>
              ) : (
                <View style={{ width: PREVIEW, height: PREVIEW, borderRadius: theme.radii.md, backgroundColor: theme.colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' }}>
                  <Text variant="caption" tone="secondary">no hand</Text>
                </View>
              )}
            </View>
            <Text variant="bodyMedium" style={{ marginTop: theme.spacing.sm }} color={run.deterministic ? theme.colors.success : run.deterministic === null ? theme.colors.textSecondary : theme.colors.danger}>
              {run.deterministic === null ? 'FALLBACK (no hand detected)' : run.deterministic ? 'PASS — byte-identical' : 'FAIL — outputs differ'}
            </Text>
            <Text variant="caption" tone="secondary">
              {run.handedness} · {(run.bytes / 1024).toFixed(0)} KB · 2 runs in {run.ms} ms{run.error ? ` · ${run.error}` : ''}
            </Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
