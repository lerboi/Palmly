import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { AppHeader, Button, Card, Icon, PrivacyBadge, Screen, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useTheme } from '@/theme';
import { type Reading, type ReadingSection, freeSections, lockedSections, traditionFootnote } from './reveal';

export type RevealState = 'ready' | 'pending' | 'error';

export interface RevealViewProps {
  reading: Reading;
  geometry: LineGeometry;
  /** `pending` while the reading loads, `error` on load failure (redesign R15). Default `ready`. */
  state?: RevealState;
  onBack?: () => void;
  onRetry?: () => void;
}

/** Section key → feature line-icon (redesign §2 — replaces the cinnabar CJK section glyphs). */
const SECTION_ICON: Record<string, IconName> = {
  hand_shape: 'sparkle',
  heart: 'heart',
  head: 'mind',
  life: 'life',
  fate: 'path',
  mounts: 'streak',
  markings: 'sparkle',
};

/**
 * The reading reveal (UIUX §2.5, redesign R15) — the "wow". The user's own palm as the traced
 * hero, the headline trait, icon-led section cards, locked premium depth → paywall, the
 * compatibility hook, and a single trust footer. English-first, no decorative CJK. Includes a
 * calm pending + error state.
 */
export function RevealView({ reading, geometry, state = 'ready', onBack, onRetry }: RevealViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const back = onBack ?? (() => router.back());

  if (state === 'pending') {
    return (
      <Screen>
        <AppHeader onBack={back} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg }}>
          <PalmDiagram geometry={geometry} size={200} animate={false} silhouette />
          <Text variant="title" style={{ textAlign: 'center' }}>
            Preparing your reading…
          </Text>
          <PrivacyBadge />
        </View>
      </Screen>
    );
  }

  if (state === 'error') {
    return (
      <Screen>
        <AppHeader onBack={back} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg }}>
          <FeatureIcon icon="sparkle" tone="heritage" size={88} />
          <Text variant="title" style={{ textAlign: 'center' }}>
            We couldn&apos;t load your reading
          </Text>
          <Text variant="bodyLarge" tone="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
            Your lines are safe — this was just a hiccup on our side.
          </Text>
        </View>
        <Button
          label="Try again"
          variant="primary"
          fullWidth
          style={{ marginBottom: theme.spacing.md }}
          onPress={onRetry ?? back}
        />
      </Screen>
    );
  }

  const free = freeSections(reading);
  const locked = lockedSections(reading);

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll>
        <AppHeader onBack={back} />
        {/* ── Hero: traced palm + headline ── */}
        <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
          <PalmDiagram geometry={geometry} size={260} signatureLines={['heart_line', 'fate_line']} />
          <Text variant="display" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
            {reading.headline}
          </Text>
          {reading.summary ? (
            <Text variant="bodyLarge" tone="secondary" style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
              {reading.summary}
            </Text>
          ) : null}
        </View>

        {/* ── Free section cards; the compatibility hook lives inside the reading (P2) ── */}
        {free.map((section, i) => (
          <View key={section.key}>
            <SectionCard section={section} />
            {i === 1 ? <CompareCard onPress={() => router.push('/share')} /> : null}
          </View>
        ))}

        {/* ── Locked premium depth → paywall ── */}
        {locked.length > 0 ? (
          <View style={{ marginTop: theme.spacing.sm }}>
            <Text variant="heading" style={{ marginBottom: theme.spacing.md }}>
              Go deeper
            </Text>
            {locked.map((section) => (
              <LockedCard key={section.key} section={section} onUnlock={() => router.push('/paywall')} />
            ))}
          </View>
        ) : null}

        <TrustFooter onMethodology={() => router.push('/methodology')} />
        <FaceOfferCard onPress={() => router.push('/face')} />

        {reading.disclaimer ? (
          <Text variant="caption" tone="tertiary" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
            {reading.disclaimer}
          </Text>
        ) : null}
      </Screen>

      {/* ── Persistent share affordance (a single accent FAB; the seal lives on the share card) ── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share this reading"
        onPress={() => router.push('/share')}
        style={{ position: 'absolute', right: theme.spacing.lg, bottom: theme.spacing.xl }}
      >
        <View
          style={[
            {
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: theme.colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            },
            theme.shadow.md,
          ]}
        >
          <Icon name="share" size={24} color={theme.colors.onAccent} decorative />
        </View>
      </Pressable>
    </View>
  );
}

/** A rounded tinted tile holding a feature icon — the section marker. */
function FeatureIcon({
  icon,
  tone = 'accent',
  size = 44,
}: {
  icon: IconName;
  tone?: 'accent' | 'heritage' | 'premium';
  size?: number;
}) {
  const theme = useTheme();
  const color =
    tone === 'heritage' ? theme.colors.heritageAccent : tone === 'premium' ? theme.colors.premium : theme.colors.accent;
  const bg = tone === 'accent' ? theme.colors.accentMuted : theme.colors.surfaceSunken;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: theme.radii.md,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} color={color} decorative />
    </View>
  );
}

function SectionCard({ section }: { section: ReadingSection }) {
  const theme = useTheme();
  return (
    <Card elevation="sm" style={{ marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <FeatureIcon icon={SECTION_ICON[section.key] ?? 'sparkle'} />
        <View style={{ flex: 1 }}>
          <Text variant="heading">{section.title}</Text>
          {section.body ? (
            <Text variant="body" style={{ marginTop: theme.spacing.sm }}>
              {section.body}
            </Text>
          ) : null}
          <Text variant="caption" tone="tertiary" style={{ marginTop: theme.spacing.sm }}>
            {traditionFootnote(section)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function CompareCard({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Card elevation="md" style={{ marginBottom: theme.spacing.md, alignItems: 'center' }}>
      <FeatureIcon icon="thread" tone="heritage" />
      <Text variant="title" style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
        Compare with a friend
      </Text>
      <Text
        variant="body"
        tone="secondary"
        style={{ textAlign: 'center', marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }}
      >
        Tie a red thread — see how your palms line up.
      </Text>
      <Button label="Compare palms" onPress={onPress} fullWidth />
    </Card>
  );
}

function LockedCard({ section, onUnlock }: { section: ReadingSection; onUnlock: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onUnlock} accessibilityRole="button" accessibilityLabel={`Unlock ${section.title}`}>
      <Card elevation="sm" style={{ marginBottom: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <FeatureIcon icon="lock" tone="premium" size={44} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium">{section.title}</Text>
            <Text variant="caption" tone="premium" style={{ marginTop: 2 }}>
              Unlock with Premium
            </Text>
          </View>
          <Icon name="chevron" size={20} color={theme.colors.textTertiary} decorative />
        </View>
      </Card>
    </Pressable>
  );
}

function TrustFooter({ onMethodology }: { onMethodology: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.sm, marginVertical: theme.spacing.lg }}>
      <Text variant="small" tone="secondary" style={{ textAlign: 'center' }}>
        Same palm, same reading. Rescan anytime — your lines don&apos;t lie.
      </Text>
      <PrivacyBadge />
      <Pressable onPress={onMethodology} accessibilityRole="link">
        <Text variant="small" color={theme.colors.accent}>
          How Palmly reads →
        </Text>
      </Pressable>
    </View>
  );
}

function FaceOfferCard({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Card elevation="sm" style={{ marginBottom: theme.spacing.xl }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
        <FeatureIcon icon="sparkle" />
        <Text variant="heading" style={{ flex: 1 }}>
          Your face tells the other half
        </Text>
      </View>
      <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        Run the same reading on your face — proportions, features, and what they reveal.
      </Text>
      <Button label="Read my face" variant="secondary" onPress={onPress} />
    </Card>
  );
}
