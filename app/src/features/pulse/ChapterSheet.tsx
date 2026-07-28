import { Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { chapterEndLabel, chapterFor, featureLabel } from './pulseMath';
import { describeChapter, type DescribedChapter } from './chapters';

export interface ChapterSheetProps {
  visible: boolean;
  chapter: DescribedChapter;
  featureKey: string;
  /** The reader's own `feature_hash` — needed to compute what comes NEXT. */
  geometryHash: string;
  premium: boolean;
  locale?: string;
  onClose: () => void;
  onUnlock?: () => void;
}

/**
 * The chapter reading (Audit-5 · 02 §7) — a bottom sheet on the standard `ConfirmSheet` chassis
 * (drag handle, scrim-cancel), so it reads as the same object as every other sheet in the app.
 *
 * Free sees the chapter's name, its dates and ONE teaser line, then a single lock line — the
 * Audit-4 §4.2 pattern, never a blurred paragraph (the research's Nebula failure: blurring paid
 * content next to free content destroys trust). Premium sees the reading plus what comes next,
 * because the next chapter's NAME and START are the part worth waiting for.
 */
export function ChapterSheet({ visible, chapter, featureKey, geometryHash, premium, locale, onClose, onUnlock }: ChapterSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  if (!visible) return null;

  // The next chapter is one more call to the same pure function — the day after this one ends.
  const next = describeChapter(chapterFor(featureKey, geometryHash, shiftDay(chapter.ends_on, 1)), featureKey);
  const range = `${chapterEndLabel(chapter.starts_on, locale)} – ${chapterEndLabel(chapter.ends_on, locale)}`;

  return (
    <Modal transparent animationType={shouldAnimate ? 'fade' : 'none'} onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        style={{ flex: 1, backgroundColor: theme.colors.scrim, justifyContent: 'flex-end' }}
      >
        {/* Taps inside the sheet must not dismiss it.
            `maxHeight` lives HERE, on the direct child of the `flex: 1` scrim, and not on the
            Animated.View below. Found on the S20+: a percentage max-height resolves against the
            parent's height, and this wrapper had none — so the bound was indefinite, the ScrollView
            sized to its content instead of to the screen, and everything past the fold fell off the
            bottom with nothing to scroll. The free reader could see "This chapter's full reading is
            Premium." and could not reach the Unlock button under it: a paywall path that dead-ends. */}
        <Pressable onPress={() => {}} style={{ maxHeight: '80%' }}>
          <Animated.View
            entering={shouldAnimate ? SlideInDown.duration(theme.motion.duration.base) : undefined}
            style={{
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radii.xl,
              borderTopRightRadius: theme.radii.xl,
              padding: theme.spacing.lg,
              // Clear the gesture bar / navigation inset as well as the sheet's own breathing room,
              // so the last control is never sitting under a system affordance.
              paddingBottom: theme.spacing.xxl + insets.bottom,
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: theme.radii.pill,
                backgroundColor: theme.colors.border,
                alignSelf: 'center',
                marginBottom: theme.spacing.lg,
              }}
            />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.md }}>
              <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Your {featureLabel(featureKey)}
              </Text>
              <Text variant="editorialTitle">{chapter.name}</Text>
              <Text variant="caption" tone="secondary">
                {range}
              </Text>

              {premium ? (
                <>
                  <Text variant="body" tone="secondary">
                    {chapter.body}
                  </Text>
                  {next ? (
                    <>
                      <Divider />
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                        <Icon name="chapter" size={16} color={theme.colors.textTertiary} decorative />
                        <Text variant="small" tone="secondary" style={{ flex: 1 }}>
                          Next: {next.name} · begins {chapterEndLabel(next.starts_on, locale)}
                        </Text>
                      </View>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  {/* One real line of the chapter, then one lock line. Never a blurred paragraph. */}
                  <Text variant="body" tone="secondary">
                    {chapter.tease}
                  </Text>
                  <Divider />
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
                    <Icon name="lock" size={16} color={theme.colors.textSecondary} decorative style={{ marginTop: 2 }} />
                    <Text variant="small" tone="secondary" style={{ flex: 1 }}>
                      This chapter’s full reading is Premium.
                    </Text>
                  </View>
                  <Button label="Unlock this chapter" variant="tonal" size="md" onPress={onUnlock} />
                </>
              )}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: theme.strokes.hairline, backgroundColor: theme.colors.border }} />;
}

/** `YYYY-MM-DD` + n days, UTC-safe (the same integer-day discipline as `pulseMath`). */
function shiftDay(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1) + delta * 86_400_000).toISOString().slice(0, 10);
}
