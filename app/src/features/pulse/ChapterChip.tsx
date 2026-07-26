import { Pressable, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { chapterEndLabel } from './pulseMath';
import type { DescribedChapter } from './chapters';

export interface ChapterChipProps {
  chapter: DescribedChapter;
  onPress?: () => void;
  locale?: string;
}

/**
 * "Steady water · through Aug 14" (Audit-5 · 02 §2/§7).
 *
 * The one part of Line Cycles a free reader sees — and the date is deliberately the loudest half of
 * it. A named stretch with a real end date is the tease that a horoscope cannot make: it is computed
 * from THIS reader's own geometry, so it belongs to them and to no one else.
 *
 * A caption chip on `surfaceSunken`, not an accent: the card already spends its accent on the lit
 * line, and the litmus (≤2 non-interactive accent marks per screen) has to hold.
 */
export function ChapterChip({ chapter, onPress, locale }: ChapterChipProps) {
  const theme = useTheme();
  const label = `${chapter.name} · through ${chapterEndLabel(chapter.ends_on, locale)}`;

  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.surfaceSunken,
        borderRadius: theme.radii.pill,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
      }}
    >
      <Icon name="chapter" size={14} color={theme.colors.textSecondary} decorative />
      {/* `textPrimary` on a sunken well, per the U0.T2 chip contrast contract — a chip is content. */}
      <Text variant="caption" color={theme.colors.textPrimary} numberOfLines={1} style={{ flexShrink: 1 }}>
        {label}
      </Text>
      {onPress ? <Icon name="chevron" size={14} color={theme.colors.textTertiary} decorative /> : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. Read this chapter.`}
      // The chip is short; the hit slop is what gets it to a 44pt target without a 44pt pill.
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      style={{ alignSelf: 'flex-start' }}
    >
      {body}
    </Pressable>
  );
}
