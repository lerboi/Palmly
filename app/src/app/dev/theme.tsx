import { View, ScrollView, StyleSheet } from 'react-native';
import { Button, Card, SealBadge, Text } from '@/components/ui';
import {
  ThemeProvider,
  useTheme,
  palette,
  type ColorScheme,
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

const SWATCHES: { name: string; value: string }[] = [
  { name: 'paper', value: palette.paper },
  { name: 'ink', value: palette.ink },
  { name: 'ink-wash', value: palette.inkWash },
  { name: 'cinnabar', value: palette.cinnabar },
  { name: 'gold', value: palette.gold },
  { name: 'jade', value: palette.jade },
];

const TYPE_SAMPLES: { variant: TypographyVariant; label: string }[] = [
  { variant: 'display', label: 'Your palm remembers' },
  { variant: 'title', label: 'The heart line' },
  { variant: 'heading', label: 'What we found' },
  { variant: 'body', label: 'A deep, long heart line suggests warmth held steadily over time.' },
  { variant: 'small', label: 'Traditional readers weigh both hands.' },
  { variant: 'caption', label: 'For reflection & entertainment' },
];

const MARKERS = [
  { cjk: '心', en: 'Heart' },
  { cjk: '智', en: 'Head' },
  { cjk: '命', en: 'Life' },
  { cjk: '运', en: 'Fate' },
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
          <Text variant="title">Ink &amp; Cinnabar</Text>
          <Text variant="caption" tone="secondary">
            {scheme.toUpperCase()} · 水墨 × 朱砂
          </Text>
        </View>
      </View>

      <Divider />

      {/* Color tokens */}
      <Text variant="heading">Tokens</Text>
      <View style={styles.swatchWrap}>
        {SWATCHES.map((s) => (
          <View key={s.name} style={styles.swatchItem}>
            <View
              style={[
                styles.swatch,
                { backgroundColor: s.value, borderColor: theme.colors.border },
              ]}
            />
            <Text variant="caption">{s.name}</Text>
            <Text variant="caption" tone="secondary">
              {s.value}
            </Text>
          </View>
        ))}
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
        <Text variant="title" tone="accent">
          Cinnabar display (≥18pt only)
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
        <Button label="Upload a photo instead" variant="secondary" fullWidth />
        <Button label="Not now" variant="ghost" />
        <Button label="Disabled" variant="primary" disabled fullWidth />
      </View>

      <Divider />

      {/* Card + seals */}
      <Text variant="heading">Card &amp; seal</Text>
      <Card>
        <Text variant="body">
          Your photo is analyzed, then deleted. What stays is your reading.
        </Text>
        <View style={styles.sealRow}>
          <SealBadge glyph="掌" size={36} />
          <SealBadge glyph="印" size={36} variant="outline" />
          <Text variant="caption" tone="jade">
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
});
