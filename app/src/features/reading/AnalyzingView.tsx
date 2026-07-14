import { View } from 'react-native';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { Button, Screen, Text } from '@/components/ui';
import type { ScanStatus } from '@/lib/useScanStatus';
import { useTheme } from '@/theme';
import { FAILURE_TITLE, NOTIFY_COPY, NOTIFY_CTA, OVERRUN_SOFT, STAGES, failureHint, overrunLevel, stageFor, visibleGeometry } from './analyzing';

export interface AnalyzingViewProps {
  geometry: LineGeometry;
  status: ScanStatus | null;
  elapsedMs: number;
  socialProof: string;
  failureReason?: string | null;
  onNotifyMe?: () => void;
  onRetry?: () => void;
}

/**
 * Analyzing loader (UIUX §2.4) — the anticipation builder. Their own palm with its lines tracing in
 * cinnabar as the pipeline progresses (stage-stepped here; the smooth 1.2s self-draw is a
 * device-verified Reanimated follow-up shared with the P6.T3 hero), a rotating social-proof line,
 * and the 45s-soften / 75s-notify-me overrun path. A failure shows a specific, warm one-tap retry.
 */
export function AnalyzingView({ geometry, status, elapsedMs, socialProof, failureReason, onNotifyMe, onRetry }: AnalyzingViewProps) {
  const theme = useTheme();

  if (status === 'failed') {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg }}>
          <Text variant="title" style={{ textAlign: 'center' }}>
            {FAILURE_TITLE}
          </Text>
          <Text variant="body" tone="secondary" style={{ textAlign: 'center' }}>
            {failureHint(failureReason)}
          </Text>
          <Button label="Try again" onPress={onRetry} />
        </View>
      </Screen>
    );
  }

  const stage = stageFor(status, elapsedMs);
  const overrun = overrunLevel(elapsedMs);
  const current = STAGES[stage];

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xl }}>
        <PalmDiagram geometry={visibleGeometry(geometry, stage)} size={260} highlightedLine={current.line ?? undefined} />
        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="title" style={{ textAlign: 'center' }}>
            {overrun === 'soft' ? OVERRUN_SOFT : current.message}
          </Text>
          <Text variant="small" tone="secondary">
            {socialProof}
          </Text>
        </View>
        {overrun === 'notify' ? (
          <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
            <Text variant="body" tone="secondary" style={{ textAlign: 'center' }}>
              {NOTIFY_COPY}
            </Text>
            <Button label={NOTIFY_CTA} onPress={onNotifyMe} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
