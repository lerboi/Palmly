import { View, ScrollView, StyleSheet } from 'react-native';
import { AppHeader, Button, Card, Icon, Logomark, PrivacyBadge, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { PalmDiagram } from '@/components/palm-diagram/PalmDiagram';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';
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

/** The four palm lines as feature line-icons (redesign §2 — replaces the old CJK section markers). */
const FEATURE_MARKERS: { icon: IconName; label: string }[] = [
  { icon: 'heart', label: 'Heart' },
  { icon: 'mind', label: 'Head' },
  { icon: 'life', label: 'Life' },
  { icon: 'path', label: 'Fate' },
];

const ICON_NAMES: IconName[] = [
  'heart',
  'mind',
  'life',
  'path',
  'palm',
  'face',
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
  'history',
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
        <Logomark size={44} tone="accent" />
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

      {/* Feature markers (line-icons, no CJK) */}
      <Text variant="heading">Feature markers</Text>
      <View style={styles.markerRow}>
        {FEATURE_MARKERS.map((m) => (
          <View key={m.label} style={styles.marker}>
            <Icon name={m.icon} size={26} color={theme.colors.accent} />
            <Text variant="caption" tone="secondary">
              {m.label}
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
        <Button label="Go Premium" variant="premium" fullWidth />
        <Button label="Delete everything" variant="danger" fullWidth />
        <Button
          label="With icon"
          variant="primary"
          fullWidth
          icon={<Icon name="sparkle" size={18} color={theme.colors.onAccent} decorative />}
        />
        <Button label="Analyzing…" variant="primary" loading fullWidth />
        <Button label="Working…" variant="premium" loading fullWidth />
        <Button label="Pill shape" variant="primary" shape="pill" fullWidth />
        <Button label="Disabled primary" variant="primary" disabled fullWidth />
        <Button label="Disabled danger" variant="danger" disabled fullWidth />
        <Button label="Disabled secondary" variant="secondary" disabled fullWidth />
      </View>

      <Divider />

      {/* Pressed / active states (V8 — the harness gates state, not just resting) */}
      <Text variant="heading">States</Text>
      <View style={{ gap: theme.spacing.md }}>
        <View style={styles.swatchWrap}>
          {(['accentPressed', 'premiumPressed', 'dangerPressed'] as const).map((role) => (
            <View key={role} style={styles.swatchItem}>
              <View
                style={[styles.swatch, { backgroundColor: theme.colors[role], borderColor: theme.colors.border }]}
              />
              <Text variant="caption" tone="secondary">
                {role}
              </Text>
            </View>
          ))}
        </View>
        {/* Selected/active state — the accentMuted tint + accent border used app-wide */}
        <Card
          style={{
            backgroundColor: theme.colors.accentMuted,
            borderColor: theme.colors.accent,
            borderWidth: theme.strokes.bold,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
          }}
        >
          <Icon name="check" size={20} color={theme.colors.accent} decorative />
          <Text variant="bodyMedium" color={theme.colors.accent} style={{ flex: 1 }}>
            Selected / active state
          </Text>
        </Card>
      </View>

      <Divider />

      {/* App header + privacy badge */}
      <Text variant="heading">Header &amp; privacy</Text>
      <AppHeader title="Your reading" onBack={() => {}} right={<PrivacyBadge />} />
      <AppHeader title="Settings" onBack={() => {}} />
      <AppHeader title="Scrolled content" onBack={() => {}} showDivider />
      <PrivacyBadge />

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

      {/* Pressable card + staggered entrance (V4) */}
      <Text variant="heading">Pressable &amp; entrance</Text>
      <View style={{ gap: theme.spacing.md }}>
        <Card
          elevation="sm"
          onPress={() => {}}
          accessibilityLabel="Open reading"
          pressedTint="accent"
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
        >
          <Icon name="history" size={22} color={theme.colors.accent} decorative />
          <Text variant="bodyMedium" style={{ flex: 1 }}>
            Pressable card (spring + accent tint)
          </Text>
          <Icon name="chevron" size={20} color={theme.colors.textTertiary} decorative />
        </Card>
        {[0, 1, 2].map((i) => (
          <Card key={i} elevation="sm" entranceIndex={i}>
            <Text variant="caption" tone="secondary">
              staggered entrance · index {i}
            </Text>
          </Card>
        ))}
      </View>

      <Divider />

      {/* Brand mark */}
      <Text variant="heading">Logomark</Text>
      <View style={styles.brandRow}>
        <View style={styles.brandItem}>
          <Logomark size={56} tone="ink" />
          <Text variant="caption" tone="secondary">
            ink
          </Text>
        </View>
        <View style={styles.brandItem}>
          <Logomark size={56} tone="accent" />
          <Text variant="caption" tone="secondary">
            accent
          </Text>
        </View>
        <View style={[styles.brandItem, styles.onAccentTile, { backgroundColor: theme.colors.accent }]}>
          <Logomark size={56} tone="onAccent" />
          <Text variant="caption" color={theme.colors.onAccent}>
            onAccent
          </Text>
        </View>
        <View style={styles.brandItem}>
          <Logomark size={40} variant="stamp" tone="heritage" />
          <Text variant="caption" tone="secondary">
            stamp
          </Text>
        </View>
        <View style={styles.brandItem}>
          <Logomark size={40} variant="stamp" filled />
          <Text variant="caption" tone="secondary">
            stamp filled
          </Text>
        </View>
        <View style={styles.brandItem}>
          <Logomark size={56} tone="ink" animate />
          <Text variant="caption" tone="secondary">
            draw-on
          </Text>
        </View>
      </View>

      <Divider />

      {/* PalmDiagram — the traced-palm hero (labels off / on / draw-on end-state) */}
      <Text variant="heading">Palm diagram</Text>
      <View style={styles.brandRow}>
        <PalmDiagram geometry={PREVIEW_GEOMETRY} size={120} animate={false} signatureLines={['heart_line', 'fate_line']} />
        <PalmDiagram geometry={PREVIEW_GEOMETRY} size={120} animate={false} showLabels highlightedLine="heart_line" />
        <PalmDiagram geometry={PREVIEW_GEOMETRY} size={120} animate showLabels signatureLines={['heart_line', 'fate_line']} />
      </View>
      <Text variant="caption" tone="secondary">
        ↑ signature · labeled · draw-on end-state (stagger + bloom render live on device)
      </Text>

      <Divider />

      {/* Card + seal (share-card corner stamp) */}
      <Text variant="heading">Card &amp; stamp</Text>
      <Card elevation="md">
        <Text variant="body">
          Your photo is analyzed, then deleted. What stays is your reading.
        </Text>
        <View style={styles.sealRow}>
          <Logomark size={36} variant="stamp" tone="heritage" />
          <Icon name="check" size={18} color={theme.colors.success} />
          <Text variant="caption" tone="success">
            verified
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
  brandRow: { flexDirection: 'row', gap: 20, alignItems: 'center', flexWrap: 'wrap' },
  brandItem: { alignItems: 'center', gap: 6 },
  onAccentTile: { padding: 8, borderRadius: 12 },
});
