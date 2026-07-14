import { View } from 'react-native';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { AppHeader, Button, Card, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { RedThread, ScoreRing } from './ShareView';

export interface PairSubScore {
  label: string;
  value: number; // 0–100
}

export interface PairData {
  partnerName: string;
  score: number;
  headline: string;
  subScores: PairSubScore[];
  /** Both-sides narrative — where you click, where you stretch each other. */
  click: string;
  stretch: string;
}

export interface PairRevealViewProps {
  data: PairData;
  geometry: LineGeometry;
  partnerGeometry?: LineGeometry;
  onBack?: () => void;
  onFullReading?: () => void;
  onShare?: () => void;
}

/**
 * Compatibility pair-reveal (UIUX §2.7.4 / §2.10, redesign R16d) — the recipient's payoff: two
 * traced palms joined by the red thread, a gold score ring, sub-scores fanning out, and a
 * both-sides narrative. On device the thread draws + the score counts up ([~]); here they render
 * at their static end-state. English-first, no CJK.
 */
export function PairRevealView({
  data,
  geometry,
  partnerGeometry,
  onBack,
  onFullReading,
  onShare,
}: PairRevealViewProps) {
  const theme = useTheme();
  const partner = partnerGeometry ?? geometry;

  return (
    <Screen scroll>
      <AppHeader title="Your compatibility" onBack={onBack} />

      {/* Hero: two palms + red thread, then the gold score ring. */}
      <View style={{ alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <PalmDiagram geometry={geometry} size={92} animate={false} silhouette={false} />
          <RedThread />
          <PalmDiagram
            geometry={partner}
            size={92}
            animate={false}
            silhouette={false}
            style={{ transform: [{ scaleX: -1 }] }}
          />
        </View>

        <View style={{ marginTop: theme.spacing.lg }}>
          <ScoreRing score={data.score} size={148} />
        </View>
        <Text variant="title" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
          You &amp; {data.partnerName}
        </Text>
        <Text
          variant="bodyLarge"
          tone="secondary"
          style={{ textAlign: 'center', marginTop: theme.spacing.xs, maxWidth: 300 }}
        >
          {data.headline}
        </Text>
      </View>

      {/* Sub-scores fan out. */}
      <Card elevation="sm" style={{ marginTop: theme.spacing.xl }}>
        <View style={{ gap: theme.spacing.md }}>
          {data.subScores.map((s) => (
            <SubScoreBar key={s.label} label={s.label} value={s.value} />
          ))}
        </View>
      </Card>

      {/* Both-sides narrative. */}
      <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.lg }}>
        <NarrativeBlock title="Where you click" body={data.click} />
        <NarrativeBlock title="Where you'll stretch each other" body={data.stretch} />
      </View>

      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xl, marginBottom: theme.spacing.lg }}>
        <Button label="See my full reading" variant="primary" fullWidth onPress={onFullReading} />
        <Button label="Share this match" variant="tonal" fullWidth onPress={onShare} />
      </View>

      <Text variant="caption" tone="tertiary" style={{ textAlign: 'center', marginBottom: theme.spacing.lg }}>
        For reflection and entertainment.
      </Text>
    </Screen>
  );
}

function SubScoreBar({ label, value }: { label: string; value: number }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
      <Text variant="bodyMedium" style={{ width: 84 }}>
        {label}
      </Text>
      <View
        style={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          backgroundColor: theme.colors.surfaceSunken,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.colors.accent,
          }}
        />
      </View>
      <Text variant="caption" tone="secondary" style={{ width: 28, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

function NarrativeBlock({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <View>
      <Text variant="heading">{title}</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
        {body}
      </Text>
    </View>
  );
}
