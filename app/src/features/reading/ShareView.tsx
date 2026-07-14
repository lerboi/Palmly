import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { AppHeader, Button, Icon, Logomark, Screen, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useTheme } from '@/theme';

export interface ShareViewProps {
  geometry: LineGeometry;
  /** The one-line shareable essence (redesign §2.6). */
  headline: string;
  /** Compatibility score 0–100 for the compare variant. */
  score: number;
  partnerName: string;
  /** Which preview to open on (default `solo`, per §2.6). */
  initialVariant?: Variant;
  onClose?: () => void;
}

type Variant = 'solo' | 'compat';

const CHANNELS: { icon: IconName; label: string }[] = [
  { icon: 'chat', label: 'Message' },
  { icon: 'thread', label: 'Copy link' },
  { icon: 'share', label: 'More' },
];

/**
 * The custom share sheet (UIUX §2.6/§2.7, redesign R16) — a preview card with the traced palm as
 * the hero + a single corner seal, a compatibility variant with a lightened red-thread + gold
 * score ring, an invite toggle, and a modern channel row. The OS share sheet + per-country brand
 * channels are device-only ([~]); this is the in-app preview above them, seeded with a fixture.
 */
export function ShareView({
  geometry,
  headline,
  score,
  partnerName,
  initialVariant = 'solo',
  onClose,
}: ShareViewProps) {
  const theme = useTheme();
  const [variant, setVariant] = useState<Variant>(initialVariant);
  const [invite, setInvite] = useState(true);

  return (
    <Screen>
      <AppHeader title="Share your reading" onBack={onClose} />

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
        <Segment label="My reading" active={variant === 'solo'} onPress={() => setVariant('solo')} />
        <Segment label="Compatibility" active={variant === 'compat'} onPress={() => setVariant('compat')} />
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        {variant === 'solo' ? (
          <SoloPreview geometry={geometry} headline={headline} />
        ) : (
          <CompatPreview geometry={geometry} score={score} partnerName={partnerName} />
        )}
      </View>

      {/* Invite-to-compare toggle (default ON for compat, per §2.6). */}
      <Pressable
        onPress={() => setInvite((v) => !v)}
        accessibilityRole="switch"
        accessibilityState={{ checked: invite }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          paddingVertical: theme.spacing.md,
        }}
      >
        <Icon name="thread" size={22} color={theme.colors.heritageAccent} decorative />
        <Text variant="body" style={{ flex: 1 }}>
          Invite them to compare palms
        </Text>
        <Toggle on={invite} />
      </Pressable>

      {/* Channel row. */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: theme.spacing.md }}>
        {CHANNELS.map((ch) => (
          <View key={ch.label} style={{ alignItems: 'center', gap: theme.spacing.xs }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: theme.colors.surfaceSunken,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={ch.icon} size={24} color={theme.colors.accent} decorative />
            </View>
            <Text variant="caption" tone="secondary">
              {ch.label}
            </Text>
          </View>
        ))}
      </View>

      <Button
        label="Share"
        variant="primary"
        fullWidth
        icon={<Icon name="share" size={18} color={theme.colors.onAccent} decorative />}
        style={{ marginBottom: theme.spacing.md }}
        onPress={onClose}
      />
    </Screen>
  );
}

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radii.md,
        backgroundColor: active ? theme.colors.accentMuted : theme.colors.surfaceSunken,
        borderWidth: theme.strokes.hairline,
        borderColor: active ? theme.colors.accent : 'transparent',
      }}
    >
      <Text variant="bodyMedium" color={active ? theme.colors.accent : theme.colors.textSecondary}>
        {label}
      </Text>
    </Pressable>
  );
}

function Toggle({ on }: { on: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 46,
        height: 28,
        borderRadius: 14,
        padding: 3,
        backgroundColor: on ? theme.colors.accent : theme.colors.border,
        alignItems: on ? 'flex-end' : 'flex-start',
      }}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.surface }} />
    </View>
  );
}

/** The share CARD preview — traced palm hero (~60%) + a single corner seal. */
function SoloPreview({ geometry, headline }: { geometry: LineGeometry; headline: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.xl,
          alignItems: 'center',
        },
        theme.shadow.lg,
      ]}
    >
      <PalmDiagram geometry={geometry} size={200} signatureLines={['heart_line', 'fate_line']} animate={false} />
      <Text variant="title" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
        {headline}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
        <Logomark size={24} tone="ink" />
        <Text variant="caption" tone="tertiary">
          palmly.app
        </Text>
        <View style={{ flex: 1 }} />
        <Logomark size={28} variant="stamp" tone="heritage" />
      </View>
    </View>
  );
}

/** The compatibility share card — two palms, a lightened red-thread, a gold score ring. */
function CompatPreview({
  geometry,
  score,
  partnerName,
}: {
  geometry: LineGeometry;
  score: number;
  partnerName: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.xl,
          alignItems: 'center',
        },
        theme.shadow.lg,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
        <PalmDiagram geometry={geometry} size={84} animate={false} silhouette={false} />
        <RedThread />
        <PalmDiagram
          geometry={geometry}
          size={84}
          animate={false}
          silhouette={false}
          style={{ transform: [{ scaleX: -1 }] }}
        />
      </View>

      <View style={{ marginTop: theme.spacing.lg }}>
        <ScoreRing score={score} />
      </View>

      <Text variant="title" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
        You &amp; {partnerName}
      </Text>
      <Text variant="body" tone="secondary" style={{ textAlign: 'center', marginTop: theme.spacing.xs }}>
        A rare, easy resonance — you steady each other.
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.lg, alignSelf: 'stretch' }}>
        <Logomark size={24} tone="ink" />
        <Text variant="caption" tone="tertiary">
          palmly.app
        </Text>
        <View style={{ flex: 1 }} />
        <Logomark size={28} variant="stamp" tone="heritage" />
      </View>
    </View>
  );
}

/** The red thread between two palms — a lightened heritage curve with two knot nodes. */
function RedThread() {
  const theme = useTheme();
  return (
    <Svg width={72} height={60} viewBox="0 0 72 60">
      <Path
        d="M4 30 C22 8, 50 52, 68 30"
        fill="none"
        stroke={theme.colors.heritageAccent}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Circle cx={4} cy={30} r={4} fill={theme.colors.heritageAccent} />
      <Circle cx={68} cy={30} r={4} fill={theme.colors.heritageAccent} />
    </Svg>
  );
}

function ScoreRing({ score }: { score: number }) {
  const theme = useTheme();
  const d = 96;
  const r = d / 2 - 6;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: d, height: d, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={d} height={d} style={{ position: 'absolute' }}>
        <Circle cx={d / 2} cy={d / 2} r={r} stroke={theme.colors.border} strokeWidth={6} fill="none" />
        <Circle
          cx={d / 2}
          cy={d / 2}
          r={r}
          stroke={theme.colors.premium}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          transform={`rotate(-90 ${d / 2} ${d / 2})`}
        />
      </Svg>
      <Text variant="numeral" color={theme.colors.premium}>
        {score}
      </Text>
    </View>
  );
}
