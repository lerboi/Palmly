import { useState, type ComponentType } from 'react';
import { Modal, Platform, Pressable, TextInput, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';

import { Button, Text } from '@/components/ui';
import { useReducedMotion, useTheme } from '@/theme';
import { localDateKey } from './openHistory';

interface NativePickerProps {
  value: Date;
  mode: 'date';
  display: 'spinner';
  maximumDate?: Date;
  onChange: (event: unknown, picked?: Date) => void;
  accessibilityLabel?: string;
}

/**
 * The platform date spinner, loaded **defensively**.
 *
 * `@react-native-community/datetimepicker` is a NATIVE module: its module body calls
 * `TurboModuleRegistry.getEnforcing('RNCDatePicker')`, which throws at import time in any binary
 * that predates the dependency (an older dev client, Expo Go). A static import therefore took the
 * whole **Today tab** down with a red screen — the route module never finished evaluating, so
 * expo-router also reported it as "missing the required default export".
 *
 * An optional native dependency must not be able to do that. When the module is absent we fall back
 * to the same typed `YYYY-MM-DD` field the web build uses (D36), so the birth-date ask still works;
 * a rebuilt dev client picks the real spinner back up with no code change.
 */
const NativeDatePicker: ComponentType<NativePickerProps> | null = (() => {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-community/datetimepicker').default as ComponentType<NativePickerProps>;
  } catch {
    return null; // native module not in this binary — the typed field covers it
  }
})();

export interface BirthDateSheetProps {
  /** Save the chosen `YYYY-MM-DD` (the caller persists it + reloads the fortune). */
  onSave: (birthDate: string) => void;
  /** Dismiss for good — the fortune stays on the generic bucket, and we never ask again. */
  onSkip: () => void;
  busy?: boolean;
  /** A save just failed — show the warm inline error and KEEP the sheet open (SH-4). */
  failed?: boolean;
}

/** Sensible spinner start: an adult birthday, not today. */
const DEFAULT_YEAR_OFFSET = 30;
const VALID = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * The birth-date ask, as a **sheet** (Audit-4 SH-4, Direction §4.3).
 *
 * What it replaces: a full-screen blocker — despite the name — shown BEFORE any value, asking for a
 * hand-typed `YYYY-MM-DD` with no picker, no auto-hyphen and no validation message; "Skip" was not
 * persisted, so it re-nagged on every single open; and a save failure was silent.
 *
 * Now: a scrim + drag handle + slide-up over Today, offered only after the first fortune renders,
 * with the platform date spinner. Skipping is permanent (Settings keeps a way back in) and a failed
 * save leaves the sheet up with a warm inline error instead of vanishing.
 */
export function BirthDateSheet({ onSave, onSkip, busy, failed }: BirthDateSheetProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && Platform.OS !== 'web';
  // The typed field covers BOTH cases the spinner can't: web, and a binary without the native
  // module. `canSave` and `submit` follow the field that is actually on screen.
  const typedMode = Platform.OS === 'web' || NativeDatePicker === null;

  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - DEFAULT_YEAR_OFFSET);
    return d;
  });
  const [typed, setTyped] = useState('');
  const canSave = typedMode ? VALID.test(typed.trim()) : true;
  const submit = () => onSave(typedMode ? typed.trim() : localDateKey(date));

  return (
    <Modal transparent animationType={shouldAnimate ? 'fade' : 'none'} onRequestClose={onSkip}>
      {/* Scrim — tapping it dismisses, the same as Skip (a sheet is never a trap). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={onSkip}
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
            {/* Drag handle — the affordance that says "this is a sheet, it can go away". */}
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

            <Text variant="title">When were you born?</Text>
            <Text variant="body" tone="secondary">
              Your birth date tunes each day’s fortune to you.
            </Text>

            {typedMode || !NativeDatePicker ? (
              <TextInput
                value={typed}
                onChangeText={setTyped}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textTertiary}
                autoCorrect={false}
                maxLength={10}
                accessibilityLabel="Birth date, year month day"
                style={{
                  fontFamily: theme.fonts.body,
                  fontSize: theme.typography.bodyLarge.fontSize,
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.surfaceSunken,
                  borderRadius: theme.radii.lg,
                  borderWidth: theme.strokes.hairline,
                  borderColor: theme.colors.border,
                  paddingVertical: theme.spacing.md,
                  paddingHorizontal: theme.spacing.md,
                }}
              />
            ) : (
              <NativeDatePicker
                value={date}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_e, picked) => picked && setDate(picked)}
                accessibilityLabel="Birth date"
              />
            )}

            {failed ? (
              <Text variant="caption" tone="danger">
                That didn’t save — check your connection and try again.
              </Text>
            ) : null}

            <Button label="See my fortune" variant="primary" fullWidth loading={busy} disabled={!canSave} onPress={submit} />
            <Button label="Not now" variant="ghost" fullWidth disabled={busy} onPress={onSkip} />
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
