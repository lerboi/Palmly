import { Pressable, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { controlHeight, usePressSpring, useTheme } from '@/theme';
import { tick } from '@/lib/haptics';
import { Icon, type IconName } from './Icon';

/**
 * The tap-target floor for a header/chrome icon button, in points. Exported so the contract is
 * testable without a component renderer (this repo has no RN testing library, and the Audit-4
 * ledger forbids adding one). Every adopter gets this box whatever the glyph inside measures.
 */
export const HEADER_ICON_BUTTON_SIZE = controlHeight.md;

export interface HeaderIconButtonProps {
  name: IconName;
  onPress: () => void;
  /**
   * Optional secondary action on a long press. Used for affordances that are deliberately
   * discoverable-but-not-advertised (Audit-5 02 §6: the camera icon long-press opens the
   * seal-the-day ritual). Never the ONLY way to reach something a user needs.
   */
  onLongPress?: () => void;
  /** Spoken hint for the long-press action, so it is not invisible to a screen reader. */
  accessibilityHint?: string;
  /** Spoken name — required, because the glyph alone tells a screen reader nothing. */
  accessibilityLabel: string;
  /** Glyph size inside the 44pt box. Default 24. */
  size?: number;
  /** Glyph color. Defaults to `textSecondary` — chrome is ink (Direction §1 P1). */
  color?: string;
  style?: ViewStyle;
}

/**
 * A header / chrome icon button (Audit-4 CO-9). One component so every gear, camera, close and
 * share affordance gets the same three things the app kept missing at these call sites:
 *
 *  1. a **44pt** hit box — these shipped at 38–42pt, or as a bare `Pressable` sized by its glyph;
 *  2. the shared press spring (native only; reduce-motion / web render the resting scale);
 *  3. a haptic `tick()` — `Button` and `Card` have always ticked, headers never did.
 *
 * The box is centred on the glyph, so swapping a 22px icon for a 24px one moves nothing.
 */
export function HeaderIconButton({
  name,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
  size = 24,
  color,
  style,
}: HeaderIconButtonProps) {
  const theme = useTheme();
  const { scaleStyle, onPressIn, onPressOut } = usePressSpring(0.9);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        onPressIn();
        tick();
      }}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[
        {
          width: HEADER_ICON_BUTTON_SIZE,
          height: HEADER_ICON_BUTTON_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Animated.View style={scaleStyle}>
        <Icon name={name} size={size} color={color ?? theme.colors.textSecondary} decorative />
      </Animated.View>
    </Pressable>
  );
}

/** A header text link — same 44pt floor and press spring, for chrome that is a word, not a glyph. */
export function HeaderTextButton({
  children,
  onPress,
  accessibilityRole = 'button',
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityRole?: 'button' | 'link';
  style?: ViewStyle;
}) {
  const { scaleStyle, onPressIn, onPressOut } = usePressSpring(0.95);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        onPressIn();
        tick();
      }}
      onPressOut={onPressOut}
      accessibilityRole={accessibilityRole}
      style={[{ minHeight: HEADER_ICON_BUTTON_SIZE, justifyContent: 'center' }, style]}
    >
      <Animated.View style={scaleStyle}>
        <View>{children}</View>
      </Animated.View>
    </Pressable>
  );
}
