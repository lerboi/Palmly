import { Modal, Platform, Pressable, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';

import { useReducedMotion, useTheme } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

export interface ConfirmSheetProps {
  /** Render the sheet. Keep the component mounted and toggle this. */
  visible: boolean;
  title: string;
  body?: string;
  /** The destructive/leaving action. */
  confirmLabel: string;
  /** The safe action — also what the scrim and the hardware back button do. */
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A two-choice confirm, as a bottom sheet (Audit-4 SN-7).
 *
 * Built because leaving an in-flight scan was silent: Back abandoned a reading mid-pipeline with no
 * warning and no way to re-enter, since `/analyzing` cannot be resumed. A sheet (not an `Alert`)
 * keeps the moment inside the app's own type and color, and the scrim always resolves to *cancel* —
 * the safe branch — so a stray tap can never be the destructive one.
 */
export function ConfirmSheet({ visible, title, body, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmSheetProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  if (!visible) return null;

  return (
    <Modal transparent animationType={shouldAnimate ? 'fade' : 'none'} onRequestClose={onCancel}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cancelLabel}
        onPress={onCancel}
        style={{ flex: 1, backgroundColor: theme.colors.scrim, justifyContent: 'flex-end' }}
      >
        {/* Taps inside the sheet must not dismiss it. */}
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
            <Text variant="title">{title}</Text>
            {body ? (
              <Text variant="body" tone="secondary">
                {body}
              </Text>
            ) : null}
            <Button label={confirmLabel} variant="secondary" fullWidth onPress={onConfirm} />
            <Button label={cancelLabel} variant="primary" fullWidth onPress={onCancel} />
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
