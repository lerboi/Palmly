import { useEffect } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';

import { Button, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { PulseSeal } from './PulseSeal';
import type { StreakMilestone } from './streak';

export interface MilestoneMomentProps {
  visible: boolean;
  /** The day the run just reached — 3, 7, 14 or 30. */
  day: StreakMilestone;
  premium: boolean;
  /** Fired once, when the sheet actually appears — the moment the milestone was REACHED. */
  onShown?: (day: StreakMilestone) => void;
  onShare: () => void;
  onDismiss: () => void;
}

/**
 * The milestone moment (Audit-5 · 02 §7, 01 §7 T3) — day 3 / 7 / 14 / 30.
 *
 * **Give first, sell second.** The primary action is a free share card; the premium line, on the
 * larger milestones only, is one caption with no lock icon and no button. A user who has just been
 * congratulated for showing up thirty days running is the last person to hit with a paywall UI, and
 * the share card is worth more to the product anyway — it feeds acquisition.
 *
 * Fires AFTER the reveal, never before: the sheet has to land on top of value already received
 * (01 §7). And it fires on the server's `first_seal_today` only, so a second device or an offline
 * estimate can never re-congratulate the same day.
 */
export function MilestoneMoment({ visible, day, premium, onShown, onShare, onDismiss }: MilestoneMomentProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';

  // Emitted on APPEARANCE, not on dismissal: the event means "this run reached day N", and a user
  // who swipes the sheet away has still reached it.
  useEffect(() => {
    if (visible) onShown?.(day);
  }, [visible, day, onShown]);

  if (!visible) return null;

  return (
    <Modal transparent animationType={shouldAnimate ? 'fade' : 'none'} onRequestClose={onDismiss}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onDismiss}
        style={{ flex: 1, backgroundColor: theme.colors.scrim, justifyContent: 'flex-end' }}
      >
        <Pressable onPress={() => {}}>
          <Animated.View
            entering={shouldAnimate ? SlideInDown.duration(theme.motion.duration.base) : undefined}
            style={{
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radii.xl,
              borderTopRightRadius: theme.radii.xl,
              padding: theme.spacing.lg,
              paddingBottom: theme.spacing.xxl,
              gap: theme.spacing.md,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: theme.radii.pill,
                backgroundColor: theme.colors.border,
                alignSelf: 'center',
                marginBottom: theme.spacing.sm,
              }}
            />
            {/* The same seal art as the reveal, at half scale and already stamped — the moment is a
                receipt for a gesture they have made `day` times, so it should look like that gesture. */}
            <PulseSeal compact stamped onComplete={() => {}} accessibilityLabel={`${day} days sealed`} />
            <Text variant="editorialTitle" style={{ textAlign: 'center' }}>
              {day} days of your lines holding.
            </Text>
            <Text variant="body" tone="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
              Same palm, same lines — {day} mornings running.
            </Text>
            <Button label="Share your week" variant="primary" fullWidth style={{ marginTop: theme.spacing.sm }} onPress={onShare} />
            <Button label="Keep going" variant="ghost" size="md" onPress={onDismiss} />
            {/* One soft caption on the bigger milestones. No lock icon, no CTA — this is a mention,
                not a pitch (02 §7). */}
            {!premium && (day === 7 || day === 30) ? (
              <Text variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
                Your full daily readings are Premium.
              </Text>
            ) : null}
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
