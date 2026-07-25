import { Platform, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, Card, Icon, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { askPrefill, DIRECTION_BEARING, luckyBasis, type Fortune } from './fortune';

/**
 * The daily fortune card (UIUX §2.11, redesign R18 / v2 V17) — a true hero (`elevation="md"` +
 * surfaceRaised): an accent-chip header, the free `overall` essence promoted to the visual anchor,
 * and an unlock CTA. Premium **unfolds** the Do/Avoid lists (Avoid in `danger`, not heritage — the
 * claret is reserved for the red-thread, §3.2), the career/love/wealth lines, and the lucky
 * direction/colour/hours (U4 gating), each section staggering in. English-first, no CJK.
 */
export function FortuneCard({ fortune, premium, onUnlock, onAsk }: { fortune: Fortune; premium: boolean; onUnlock?: () => void; onAsk?: (prefill: string) => void }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  // Lucky-row columns follow the real screen width (CO-6), not a fixed minWidth that could not shrink.
  const { width } = useWindowDimensions();
  const basis = luckyBasis(width);
  const unfold = (i: number) =>
    shouldAnimate ? FadeInDown.delay(i * theme.motion.stagger.reveal).duration(theme.motion.duration.base) : undefined;

  return (
    // The hero animates FIRST (Direction §3): Today used to spring its secondary rows in while
    // the fortune card — the page's whole point — just appeared.
    <Card elevation="md" entranceIndex={0} style={{ marginBottom: theme.spacing.md }}>
      {/* Eyebrow, no icon chip (Direction §4.2). The chip was one more decorative mark on a card
          that was already running four hues at once. */}
      <Text
        variant="caption"
        tone="secondary"
        style={{ textTransform: 'uppercase', letterSpacing: 1, marginBottom: theme.spacing.sm }}
      >
        Today&apos;s fortune
      </Text>

      {/* The essence is the card's hero and its share crop — set in the serif, the one editorial
          moment this surface gets (Direction §4.2). It was plain 17px body before. */}
      <Text variant="editorialTitle">{fortune.overall}</Text>

      {!premium ? (
        <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md, alignItems: 'flex-start' }}>
          {/* ONE lock line (Audit-4 CP-6 / Direction §5). It was a seven-item interpunct feature
              list — "Do · Avoid · lucky direction · hours · love, career & wealth" — set in
              low-contrast gold, which reads as a spec sheet rather than an invitation. */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
            <Icon name="lock" size={16} color={theme.colors.textSecondary} decorative style={{ marginTop: 2 }} />
            <Text variant="small" tone="secondary" style={{ flex: 1 }}>
              The full almanac — do &amp; avoid, lucky hours, love, career, wealth — is Premium.
            </Text>
          </View>
          <Button label="Unlock the full almanac" variant="tonal" size="md" onPress={onUnlock} />
        </View>
      ) : (
        <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.lg }}>
          <Animated.View entering={unfold(0)} style={{ gap: theme.spacing.lg }}>
            <DoDont title="Do" items={fortune.dos} tone="success" />
            <DoDont title="Avoid" items={fortune.donts} tone="danger" />
          </Animated.View>

          <Divider />

          <Animated.View entering={unfold(1)} style={{ gap: theme.spacing.md }}>
            <Aspect label="Career" text={fortune.career} />
            <Aspect label="Love" text={fortune.love} />
            <Aspect label="Wealth" text={fortune.wealth} />
          </Animated.View>

          <Divider />

          <Animated.View entering={unfold(2)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.lg }}>
            <Lucky label="Direction" value={fortune.lucky_direction} bearing={DIRECTION_BEARING[fortune.lucky_direction]} basis={basis} />
            <Lucky label="Color" value={fortune.lucky_color} basis={basis} />
            <Lucky label="Hours" value={fortune.lucky_hours} basis={basis} />
          </Animated.View>

          {/* Fortune → chat bridge (audit §7 P4) — pre-fills the grounded chat with today's almanac. */}
          {onAsk ? (
            <Animated.View entering={unfold(3)} style={{ alignItems: 'flex-start' }}>
              <Button
                label="Ask about today"
                variant="ghost"
                size="md"
                icon={<Icon name="chat" size={16} color={theme.colors.accentPressed} decorative />}
                onPress={() => onAsk(askPrefill(fortune))}
              />
            </Animated.View>
          ) : null}
        </View>
      )}
    </Card>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: theme.strokes.hairline, backgroundColor: theme.colors.border }} />;
}

/** Shared uppercase section eyebrow (Aspect + Lucky both use it). */
function SectionLabel({ children }: { children: string }) {
  // `secondary`, not `tertiary`: tertiary is for hints and disabled state, and these are content
  // (Audit-4 CC-5 — tertiary measured 2.66:1 and was being used for real copy).
  return (
    <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
      {children}
    </Text>
  );
}

/**
 * A Do or Avoid block — full width, not a column (Audit-4 CO-6: two columns squeezed into ~120pt
 * each and wrapped mid-phrase). The semantic color lives on the MARK only; the heading is ink
 * (CC-2: the card ran accent + success-green + danger-crimson + premium-gold simultaneously, and
 * `danger #A93226` sits so close to `accent #D13B27` that "Avoid" read as brand-red).
 */
function DoDont({ title, items, tone }: { title: string; items: string[]; tone: 'success' | 'danger' }) {
  const theme = useTheme();
  const color = tone === 'success' ? theme.colors.success : theme.colors.danger;
  // The marker is an ICON, not a font glyph (Audit-4 CO-8): ✓/✕ render inconsistently across
  // platforms and carry no accessible meaning. Semantic color stays on the mark only (CC-2).
  const marker: IconName = tone === 'success' ? 'check' : 'close';
  return (
    <View style={{ flex: 1, gap: theme.spacing.xs }}>
      <Text variant="heading">{title}</Text>
      {items.map((it, i) => (
        <View key={`${title}-${i}`} style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
          <Icon name={marker} size={16} color={color} decorative style={{ marginTop: 2 }} />
          <Text variant="small" tone="secondary" style={{ flex: 1 }}>
            {it}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Aspect({ label, text }: { label: string; text: string }) {
  return (
    <View style={{ gap: 2 }}>
      <SectionLabel>{label}</SectionLabel>
      <Text variant="body">{text}</Text>
    </View>
  );
}

/**
 * One Lucky cell. `flexBasis` + `minWidth: 0` is the fix for CO-6: the cell used to carry
 * `minWidth: 84` and nothing else, so it could only ever GROW to fit its content — three of them
 * overflowed a 320pt device. Now the basis sets the share and the text wraps inside it.
 */
function Lucky({ label, value, bearing, basis }: { label: string; value: string; bearing?: number; basis: `${number}%` }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 2, flexGrow: 1, flexBasis: basis, minWidth: 0 }}>
      <SectionLabel>{label}</SectionLabel>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
        {/* Unmapped bearing → no icon at all, rather than the old `' ' + value` leading space. */}
        {bearing === undefined ? null : (
          <Icon name="compass" size={16} color={theme.colors.textSecondary} rotate={bearing} decorative />
        )}
        <Text variant="bodyMedium" style={{ flexShrink: 1 }}>
          {value}
        </Text>
      </View>
    </View>
  );
}
