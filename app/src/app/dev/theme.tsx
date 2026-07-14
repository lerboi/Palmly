import { View, ScrollView, StyleSheet } from 'react-native';
import { Button, Card, Icon, SealBadge, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import {
  ThemeProvider,
  useTheme,
  activeSkin,
  type ColorScheme,
  type SkinColors,
  type TypographyVariant,
} from '@/theme';

/**
 * /dev/theme — design-system showcase (P1.T2 verify surface). Renders every token and the
 * 5 primitives in BOTH schemes at once (light | dark) by nesting two forced ThemeProviders,
 * so a single screenshot proves light + dark. Not shipped in production builds.
 */
export default function ThemeDevScreen() {
  return (
    <View style={styles.split}>
      <SchemePanel scheme="light" />
      <SchemePanel scheme="dark" />
    </View>
  );
}

function SchemePanel({ scheme }: { scheme: ColorScheme }) {
  return (
    <ThemeProvider forceScheme={scheme}>
      <PanelBody scheme={scheme} />
    </ThemeProvider>
  );
}

/** The role tokens to show in the swatch strip (a representative slice of the §3 contract). */
const SWATCH_ROLES: (keyof SkinColors)[] = [
  'bg',
  'surface',
  'surfaceSunken',
  'border',
  'textPrimary',
  'textSecondary',
  'accent',
  'accentPressed',
  'accentMuted',
  'heritageAccent',
  'premium',
  'success',
  'danger',
];

const TYPE_SAMPLES: { variant: TypographyVariant; label: string }[] = [
  { variant: 'display', label: 'Your palm remembers' },
  { variant: 'title', label: 'The heart line' },
  { variant: 'heading', label: 'What we found' },
  { variant: 'bodyLarge', label: 'A steady, unhurried heart line.' },
  { variant: 'body', label: 'A deep, long heart line suggests warmth held steadily over time.' },
  { variant: 'small', label: 'Readers weigh both hands.' },
  { variant: 'caption', label: 'For reflection & entertainment' },
];

const MARKERS = [
  { cjk: '心', en: 'Heart' },
  { cjk: '智', en: 'Head' },
  { cjk: '命', en: 'Life' },
  { cjk: '运', en: 'Fate' },
];

const ICON_NAMES: IconName[] = [
  'heart',
  'mind',
  'life',
  'path',
  'lock',
  'share',
  'send',
  'streak',
  'thread',
  'chevron',
  'back',
  'check',
  'close',
  'chat',
  'camera',
  'upload',
  'bell',
  'shield',
  'sparkle',
];

function PanelBody({ scheme }: { scheme: ColorScheme }) {
  const theme = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.panelContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <SealBadge glyph="掌" size={44} />
        <View style={{ flex: 1 }}>
          <Text variant="title">{activeSkin.name}</Text>
          <Text variant="caption" tone="secondary">
            {scheme.toUpperCase()} · role-based tokens
          </Text>
        </View>
      </View>

      <Divider />

      {/* Color tokens (role-based §3) */}
      <Text variant="heading">Tokens</Text>
      <View style={styles.swatchWrap}>
        {SWATCH_ROLES.map((role) => {
          const value = theme.colors[role];
          return (
            <View key={role} style={styles.swatchItem}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: value, borderColor: theme.colors.border },
                ]}
              />
              <Text variant="caption">{role}</Text>
              <Text variant="caption" tone="secondary">
                {value}
              </Text>
            </View>
          );
        })}
      </View>

      <Divider />

      {/* Typography */}
      <Text variant="heading">Type scale</Text>
      <View style={{ gap: theme.spacing.sm }}>
        {TYPE_SAMPLES.map((t) => (
          <Text key={t.variant} variant={t.variant}>
            {t.label}
          </Text>
        ))}
        <Text variant="numeral" tone="accent">
          88
        </Text>
        <Text variant="editorialHeadline" tone="primary">
          Your palm remembers
        </Text>
        <Text variant="caption" tone="secondary">
          ↑ optional editorial serif (reveal hero only)
        </Text>
      </View>

      <Divider />

      {/* CJK accent markers */}
      <Text variant="heading">Section markers</Text>
      <View style={styles.markerRow}>
        {MARKERS.map((m) => (
          <View key={m.cjk} style={styles.marker}>
            <Text variant="accent" tone="accent">
              {m.cjk}
            </Text>
            <Text variant="caption" tone="secondary">
              {m.en}
            </Text>
          </View>
        ))}
      </View>

      <Divider />

      {/* Buttons */}
      <Text variant="heading">Buttons</Text>
      <View style={{ gap: theme.spacing.sm }}>
        <Button label="Read my palm" variant="primary" fullWidth />
        <Button label="Save to my readings" variant="tonal" fullWidth />
        <Button label="Upload a photo instead" variant="secondary" fullWidth />
        <Button label="Not now" variant="ghost" />
        <Button
          label="With icon"
          variant="primary"
          fullWidth
          icon={<Icon name="sparkle" size={18} color={theme.colors.onAccent} decorative />}
        />
        <Button label="Analyzing…" variant="primary" loading fullWidth />
        <Button label="Pill shape" variant="primary" shape="pill" fullWidth />
        <Button label="Disabled primary" variant="primary" disabled fullWidth />
        <Button label="Disabled secondary" variant="secondary" disabled fullWidth />
      </View>

      <Divider />

      {/* Icon set */}
      <Text variant="heading">Icons</Text>
      <View style={styles.iconSheet}>
        {ICON_NAMES.map((n) => (
          <View key={n} style={styles.iconItem}>
            <Icon name={n} size={24} color={theme.colors.textPrimary} />
            <Text variant="caption" tone="secondary">
              {n}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.iconRowAccent}>
        <Icon name="heart" size={22} color={theme.colors.heritageAccent} />
        <Icon name="thread" size={22} color={theme.colors.heritageAccent} />
        <Icon name="check" size={22} color={theme.colors.success} />
        <Icon name="lock" size={22} color={theme.colors.premium} />
        <Icon name="sparkle" size={22} color={theme.colors.accent} />
      </View>

      <Divider />

      {/* Card elevation */}
      <Text variant="heading">Elevation</Text>
      <View style={{ gap: theme.spacing.md }}>
        <Card>
          <Text variant="caption" tone="secondary">
            flat (default)
          </Text>
          <Text variant="body">A hairline rule, no lift.</Text>
        </Card>
        <Card elevation="sm">
          <Text variant="caption" tone="secondary">
            elevation sm
          </Text>
          <Text variant="body">A whisper of a shadow.</Text>
        </Card>
        <Card elevation="md">
          <Text variant="caption" tone="secondary">
            elevation md
          </Text>
          <Text variant="body">The default lifted card.</Text>
        </Card>
        <Card elevation="lg">
          <Text variant="caption" tone="secondary">
            elevation lg
          </Text>
          <Text variant="body">A sheet / paywall lift.</Text>
        </Card>
      </View>

      <Divider />

      {/* Card + seals */}
      <Text variant="heading">Card &amp; seal</Text>
      <Card elevation="md">
        <Text variant="body">
          Your photo is analyzed, then deleted. What stays is your reading.
        </Text>
        <View style={styles.sealRow}>
          <SealBadge glyph="掌" size={36} />
          <SealBadge glyph="印" size={36} variant="outline" />
          <Text variant="caption" tone="success">
            ✓ verified
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

function Divider() {
  const theme = useTheme();
  return (
    <View
      style={{
        height: theme.strokes.hairline,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.md,
      }}
    />
  );
}

const styles = StyleSheet.create({
  split: { flex: 1, flexDirection: 'row' },
  panelContent: { padding: 24, gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatchWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatchItem: { width: 92, gap: 2 },
  swatch: { width: 92, height: 40, borderRadius: 8, borderWidth: 1 },
  markerRow: { flexDirection: 'row', gap: 20 },
  marker: { alignItems: 'center', gap: 2 },
  sealRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  iconSheet: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  iconItem: { width: 56, alignItems: 'center', gap: 4 },
  iconRowAccent: { flexDirection: 'row', gap: 16, marginTop: 12 },
});
