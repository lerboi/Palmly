import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { AppHeader, Button, Icon, Screen, Text } from '@/components/ui';
import type { ScanStatus } from '@/lib/useScanStatus';
import { useTheme } from '@/theme';
import {
  FAILURE_TITLE,
  NOTIFY_COPY,
  NOTIFY_CTA,
  OVERRUN_SOFT,
  STAGES,
  failureHint,
  overrunLevel,
  stageFor,
  visibleGeometry,
} from './analyzing';

export interface AnalyzingViewProps {
  geometry: LineGeometry;
  status: ScanStatus | null;
  elapsedMs: number;
  socialProof: string;
  failureReason?: string | null;
  onNotifyMe?: () => void;
  onRetry?: () => void;
  onUploadInstead?: () => void;
  onBack?: () => void;
}

/**
 * Analyzing loader (UIUX §2.4, redesign R14) — the anticipation builder. Their own palm traced
 * progressively inside an accent progress ring, a step indicator, and a rotating social-proof
 * line, with the 45s-soften / 75s-notify-me overrun path. A failure shows a calm, specific
 * one-tap retry + upload-instead. The smooth per-line self-draw + a continuously animated ring
 * are device follow-ups ([~]); here the ring reflects the current stage's progress statically.
 */
export function AnalyzingView({
  geometry,
  status,
  elapsedMs,
  socialProof,
  failureReason,
  onNotifyMe,
  onRetry,
  onUploadInstead,
  onBack,
}: AnalyzingViewProps) {
  const theme = useTheme();

  if (status === 'failed') {
    return (
      <Screen>
        <AppHeader onBack={onBack} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: theme.radii.xl,
              backgroundColor: theme.colors.accentMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="camera" size={40} color={theme.colors.accent} decorative />
          </View>
          <Text variant="title" style={{ textAlign: 'center' }}>
            {FAILURE_TITLE}
          </Text>
          <Text variant="bodyLarge" tone="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
            {failureHint(failureReason)}
          </Text>
        </View>
        <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
          <Button label="Try again" variant="primary" fullWidth onPress={onRetry} />
          <Button label="Upload a photo instead" variant="secondary" fullWidth onPress={onUploadInstead ?? onRetry} />
        </View>
      </Screen>
    );
  }

  const stage = stageFor(status, elapsedMs);
  const overrun = overrunLevel(elapsedMs);
  const current = STAGES[stage];
  const progress = (stage + 1) / STAGES.length;

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xxl }}>
        <ProgressRing progress={progress} diagramSize={232}>
          <PalmDiagram
            geometry={visibleGeometry(geometry, stage)}
            size={232}
            highlightedLine={current.line ?? undefined}
            animate={false}
          />
        </ProgressRing>

        <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
          <Text variant="title" style={{ textAlign: 'center' }}>
            {overrun === 'soft' ? OVERRUN_SOFT : current.message}
          </Text>
          <StepDots count={STAGES.length} active={stage} />
          <Text variant="small" tone="tertiary">
            {socialProof}
          </Text>
        </View>

        {overrun === 'notify' ? (
          <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
            <Text variant="body" tone="secondary" style={{ textAlign: 'center' }}>
              {NOTIFY_COPY}
            </Text>
            <Button label={NOTIFY_CTA} variant="tonal" onPress={onNotifyMe} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

/** A static accent progress arc encircling the traced palm (fills with pipeline stage). */
function ProgressRing({
  progress,
  diagramSize,
  children,
}: {
  progress: number;
  diagramSize: number;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const d = diagramSize + 56;
  const r = d / 2 - 6;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: d, height: d, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={d} height={d} style={{ position: 'absolute' }}>
        <Circle cx={d / 2} cy={d / 2} r={r} stroke={theme.colors.border} strokeWidth={5} fill="none" />
        <Circle
          cx={d / 2}
          cy={d / 2}
          r={r}
          stroke={theme.colors.accent}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          transform={`rotate(-90 ${d / 2} ${d / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** Small step indicator — one dot per pipeline stage, filled up to the active stage. */
function StepDots({ count, active }: { count: number; active: number }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 20 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i <= active ? theme.colors.accent : theme.colors.border,
          }}
        />
      ))}
    </View>
  );
}
