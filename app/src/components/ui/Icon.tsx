import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useTheme } from '@/theme';

/**
 * In-house line-icon set (redesign §5) — no icon library, no emoji, no CJK glyphs. Every icon
 * is a stroke-based 24×24 path in `react-native-svg`, inheriting a shared stroke via `<G>` so
 * it recolors cleanly with the theme. Feature icons (heart/mind/life/path) map to the palm
 * lines Heart/Head/Life/Fate. Each icon carries a default `accessibilityLabel`.
 */
export type IconName =
  | 'heart'
  | 'mind'
  | 'life'
  | 'path'
  | 'lock'
  | 'share'
  | 'send'
  | 'streak'
  | 'thread'
  | 'chevron'
  | 'back'
  | 'check'
  | 'close'
  | 'chat'
  | 'camera'
  | 'upload'
  | 'bell'
  | 'shield'
  | 'sparkle'
  | 'history'
  | 'palm'
  | 'face'
  | 'help'
  | 'elements'
  | 'globe'
  | 'document'
  | 'settings'
  | 'info'
  | 'torch';

// Geometry only — stroke/fill/caps come from the shared <G> below.
const PATHS: Record<IconName, ReactNode> = {
  heart: (
    <Path d="M12 20.5 C12 20.5 3.5 14.8 3.5 8.9 C3.5 6 5.7 4 8.2 4 C9.9 4 11.3 5 12 6.2 C12.7 5 14.1 4 15.8 4 C18.3 4 20.5 6 20.5 8.9 C20.5 14.8 12 20.5 12 20.5 Z" />
  ),
  mind: (
    <G>
      <Path d="M12 3 A6 6 0 0 1 15.5 13.8 C14.7 14.4 14.2 15 14 16 L10 16 C9.8 15 9.3 14.4 8.5 13.8 A6 6 0 0 1 12 3 Z" />
      <Path d="M10 19 H14" />
      <Path d="M11 21.5 H13" />
    </G>
  ),
  life: (
    <G>
      <Path d="M12 21 V9" />
      <Path d="M12 13.5 C12 8.8 15.3 5.5 20 5.5 C20 10.2 16.7 13.5 12 13.5 Z" />
      <Path d="M12 16.5 C12 12.8 9.2 10 5 10 C5 13.7 7.8 16.5 12 16.5 Z" />
    </G>
  ),
  path: (
    <G>
      <Path d="M7 4.5 C7 8.5 17 8.5 17 12.5 C17 16.5 7 16.5 7 20" />
      <Circle cx="7" cy="4.5" r="1.7" fill="currentColor" stroke="none" />
      <Circle cx="7" cy="19.5" r="1.7" fill="currentColor" stroke="none" />
    </G>
  ),
  lock: (
    <G>
      <Path d="M5 11 H19 V20.5 H5 Z" />
      <Path d="M8 11 V7.5 A4 4 0 0 1 16 7.5 V11" />
      <Path d="M12 14.5 V16.8" />
    </G>
  ),
  share: (
    <G>
      <Circle cx="6" cy="12" r="2.6" />
      <Circle cx="17" cy="6" r="2.6" />
      <Circle cx="17" cy="18" r="2.6" />
      <Path d="M8.4 10.8 L14.6 7.2" />
      <Path d="M8.4 13.2 L14.6 16.8" />
    </G>
  ),
  send: (
    <G>
      <Path d="M21 3 L3 9.5 L10.5 13.5 L14.5 21 Z" />
      <Path d="M21 3 L10.5 13.5" />
    </G>
  ),
  streak: (
    <Path d="M13 3 C13.5 6.5 17 8 17 12.5 A5 5 0 0 1 7 12.8 C7 10.5 8.3 9.2 9.2 8 C9.7 9 10.6 9.4 11 9 C11.8 8.2 11.5 5.5 13 3 Z" />
  ),
  thread: (
    <G>
      <Path d="M9.7 14.3 L14.3 9.7" />
      <Path d="M13 7 L14.5 5.5 A3.5 3.5 0 0 1 19.5 10.5 L18 12" />
      <Path d="M11 17 L9.5 18.5 A3.5 3.5 0 0 1 4.5 13.5 L6 12" />
    </G>
  ),
  chevron: <Path d="M9.5 5.5 L16 12 L9.5 18.5" />,
  back: (
    <G>
      <Path d="M19 12 H5" />
      <Path d="M11 5.5 L4.5 12 L11 18.5" />
    </G>
  ),
  check: <Path d="M4.5 12.5 L9.5 17.5 L19.5 6.5" />,
  close: (
    <G>
      <Path d="M6 6 L18 18" />
      <Path d="M18 6 L6 18" />
    </G>
  ),
  chat: <Path d="M4 5.5 H20 V16 H11 L6.5 20 V16 H4 Z" />,
  camera: (
    <G>
      <Path d="M4 8 H7.5 L9 6 H15 L16.5 8 H20 V19 H4 Z" />
      <Circle cx="12" cy="13" r="3.2" />
    </G>
  ),
  upload: (
    <G>
      <Path d="M12 16 V4.5" />
      <Path d="M7.5 9 L12 4.5 L16.5 9" />
      <Path d="M5 19.5 H19" />
    </G>
  ),
  bell: (
    <G>
      <Path d="M6.5 16 V11 A5.5 5.5 0 0 1 17.5 11 V16 L19.5 18.5 H4.5 Z" />
      <Path d="M10 20.5 A2 2 0 0 0 14 20.5" />
    </G>
  ),
  shield: (
    <G>
      <Path d="M12 3 L19 6 V11 C19 15.8 15.9 18.9 12 20.5 C8.1 18.9 5 15.8 5 11 V6 Z" />
      <Path d="M9 11.5 L11.2 13.7 L15.5 9.4" />
    </G>
  ),
  sparkle: (
    <Path
      d="M12 3 L13.6 8.4 L19 10 L13.6 11.6 L12 17 L10.4 11.6 L5 10 L10.4 8.4 Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  history: (
    <G>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7.5 V12 L15.5 14" />
    </G>
  ),
  palm: (
    <G>
      <Path d="M6 15 A6 6 0 0 0 18 15" />
      <Path d="M8 15 V8.5" />
      <Path d="M10.7 15 V6.5" />
      <Path d="M13.3 15 V6.5" />
      <Path d="M16 15 V8.5" />
    </G>
  ),
  face: (
    <G>
      <Path d="M12 3.5 C7.8 3.5 5.5 7 5.5 12 C5.5 17 8.4 20.5 12 20.5 C15.6 20.5 18.5 17 18.5 12 C18.5 7 16.2 3.5 12 3.5 Z" />
      <Path d="M9.4 15 C10.5 16.3 13.5 16.3 14.6 15" />
      <Circle cx="9.5" cy="11" r="0.9" fill="currentColor" stroke="none" />
      <Circle cx="14.5" cy="11" r="0.9" fill="currentColor" stroke="none" />
    </G>
  ),
  help: (
    <G>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M9.3 9.2 A2.8 2.8 0 1 1 12.3 12.1 C11.6 12.6 11.4 13.2 11.4 14" />
      <Circle cx="11.4" cy="16.6" r="0.95" fill="currentColor" stroke="none" />
    </G>
  ),
  // The five elements (五行) — a pentagon with a centre point, drawn abstractly.
  elements: (
    <G>
      <Path d="M12 3 L20.5 9.2 L17.2 19.3 L6.8 19.3 L3.5 9.2 Z" />
      <Circle cx="12" cy="12.5" r="1.4" fill="currentColor" stroke="none" />
    </G>
  ),
  globe: (
    <G>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 3 C7 6 7 18 12 21 C17 18 17 6 12 3 Z" />
      <Path d="M3.5 9.5 H20.5" />
      <Path d="M3.5 14.5 H20.5" />
    </G>
  ),
  document: (
    <G>
      <Path d="M6 3 H14 L18 7 V21 H6 Z" />
      <Path d="M14 3 V7 H18" />
      <Path d="M9 12 H15" />
      <Path d="M9 15.5 H15" />
      <Path d="M9 8.5 H11" />
    </G>
  ),
  info: (
    <G>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 11 V16.5" />
      <Circle cx="12" cy="7.6" r="0.95" fill="currentColor" stroke="none" />
    </G>
  ),
  settings: (
    <G>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </G>
  ),
  // Lightning bolt — the guided-capture torch toggle (§2.3 'dark' guidance stand-in).
  torch: <Path d="M13 2.5 L6.5 13.5 H11 L10 21.5 L17.5 10.5 H12.5 Z" />,
};

const DEFAULT_LABELS: Record<IconName, string> = {
  heart: 'Heart',
  mind: 'Mind',
  life: 'Life',
  path: 'Path',
  lock: 'Locked',
  share: 'Share',
  send: 'Send',
  streak: 'Streak',
  thread: 'Connection',
  chevron: 'More',
  back: 'Back',
  check: 'Done',
  close: 'Close',
  chat: 'Chat',
  camera: 'Camera',
  upload: 'Upload',
  bell: 'Notifications',
  shield: 'Privacy',
  sparkle: 'Insight',
  history: 'History',
  palm: 'Palm reading',
  face: 'Face reading',
  help: 'Help',
  elements: 'Elements',
  globe: 'Language',
  document: 'Document',
  settings: 'Settings',
  info: 'Information',
  torch: 'Torch',
};

export interface IconProps {
  name: IconName;
  /** Square size in px. Default 24. */
  size?: number;
  /** Stroke/fill color. Defaults to the primary text color. */
  color?: string;
  /** Stroke width at the 24px frame. Default 2. */
  strokeWidth?: number;
  /**
   * Accessibility label. Defaults to a human name per icon. Pass `""` (or `decorative`) when
   * the icon merely decorates adjacent text, to hide it from screen readers.
   */
  accessibilityLabel?: string;
  /** Hide from assistive tech (icon is purely decorative next to a text label). */
  decorative?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Icon({
  name,
  size = 24,
  color,
  strokeWidth = 2,
  accessibilityLabel,
  decorative = false,
  style,
}: IconProps) {
  const { colors } = useTheme();
  const stroke = color ?? colors.textPrimary;
  const label = accessibilityLabel ?? DEFAULT_LABELS[name];

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={style}
      // react-native-svg maps `color` to `currentColor` in child fills (the path-node dots).
      color={stroke}
      accessibilityRole={decorative ? 'none' : 'image'}
      accessibilityLabel={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
    >
      <G
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {PATHS[name]}
      </G>
    </Svg>
  );
}
