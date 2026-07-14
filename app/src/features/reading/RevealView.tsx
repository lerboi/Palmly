import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { AppHeader, Button, Card, PrivacyBadge, Screen, SealBadge, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { type Reading, type ReadingSection, SECTION_GLYPH, SECTION_LINE, freeSections, lockedSections, traditionFootnote } from './reveal';

export interface RevealViewProps {
  reading: Reading;
  geometry: LineGeometry;
}

/**
 * The reading reveal (UIUX §2.5) — the "wow". The user's own palm as an engraved ink diagram
 * (reusing {@link PalmDiagram}), the headline trait, section cards that re-highlight each line in
 * cinnabar, locked premium depth under gold seals → paywall, the compatibility hook placed inside
 * the reading, and the trust footer. The 1.2s hero self-draw is a device-verified follow-up.
 */
export function RevealView({ reading, geometry }: RevealViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const free = freeSections(reading);
  const locked = lockedSections(reading);

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll>
        <AppHeader onBack={() => router.back()} />
        {/* ── Hero: palm diagram + headline (UIUX §2.5) ── */}
        <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
          <PalmDiagram geometry={geometry} size={260} signatureLines={['heart_line', 'fate_line']} />
          <Text variant="display" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
            {reading.headline}
          </Text>
          {reading.summary ? (
            <Text variant="body" tone="secondary" style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
              {reading.summary}
            </Text>
          ) : null}
        </View>

        {/* ── Free section cards; the compatibility hook lives inside the reading (P2) ── */}
        {free.map((section, i) => (
          <View key={section.key}>
            <SectionCard section={section} geometry={geometry} />
            {i === 1 ? <CompareCard onPress={() => router.push('/share')} /> : null}
          </View>
        ))}

        {/* ── Locked premium depth: real titles under gold seals → paywall ── */}
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
          <Text variant="caption" tone="secondary" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
            {reading.disclaimer}
          </Text>
        ) : null}
      </Screen>

      {/* ── Persistent share seal (floats once value has landed) ── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share this reading"
        onPress={() => router.push('/share')}
        style={{ position: 'absolute', right: theme.spacing.lg, bottom: theme.spacing.xl }}
      >
        <SealBadge glyph="分" size={56} />
      </Pressable>
    </View>
  );
}

function SectionCard({ section, geometry }: { section: ReadingSection; geometry: LineGeometry }) {
  const theme = useTheme();
  const glyph = SECTION_GLYPH[section.key] ?? '掌';
  return (
    <Card style={{ marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <PalmDiagram geometry={geometry} size={92} highlightedLine={SECTION_LINE[section.key]} showLabels={false} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Text variant="accent" tone="accent">
              {glyph}
            </Text>
            <Text variant="heading" style={{ flex: 1 }}>
              {section.title}
            </Text>
          </View>
          <Text variant="body" style={{ marginTop: theme.spacing.sm }}>
            {section.body}
          </Text>
          <Text variant="caption" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
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
    <Card style={{ marginBottom: theme.spacing.md, alignItems: 'center' }}>
      <Text variant="title" style={{ textAlign: 'center' }}>
        Compare with a friend 🔴
      </Text>
      <Text variant="body" tone="secondary" style={{ textAlign: 'center', marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        Tie a red thread — see how your palms match.
      </Text>
      <Button label="Compare palms" onPress={onPress} fullWidth />
    </Card>
  );
}

function LockedCard({ section, onUnlock }: { section: ReadingSection; onUnlock: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onUnlock} accessibilityRole="button" accessibilityLabel={`Unlock ${section.title}`}>
      <Card style={{ marginBottom: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: theme.radii.seal,
              borderWidth: theme.strokes.bold,
              borderColor: theme.colors.gold,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="accent" color={theme.colors.gold}>
              锁
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium">{section.title}</Text>
            <Text variant="caption" tone="gold" style={{ marginTop: 2 }}>
              Tap to unlock
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function TrustFooter({ onMethodology }: { onMethodology: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.xs, marginVertical: theme.spacing.lg }}>
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
    <Card style={{ marginBottom: theme.spacing.xl }}>
      <Text variant="title">Your face tells the other half 面相</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        Run the same reading on your face — proportions, features, and what they reveal.
      </Text>
      <Button label="Read my face" variant="secondary" onPress={onPress} />
    </Card>
  );
}
