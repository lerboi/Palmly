import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Button, Icon, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

export interface BirthDateSheetProps {
  /** Save the entered YYYY-MM-DD (the caller persists it + reloads the fortune). */
  onSave: (birthDate: string) => void;
  /** Skip — the fortune stays on the generic bucket (never blocks). */
  onSkip: () => void;
  busy?: boolean;
}

const VALID = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * First-fortune birth-date ask (audit F1.3, UIUX §2.11) — ONE field, always skippable. The date maps
 * to the sexagenary day-pillar fortune bucket so "a fortune tuned to you" has a real input; skipping
 * keeps the honest `generic` bucket. English-first, no CJK; no health/identity framing.
 */
export function BirthDateSheet({ onSave, onSkip, busy }: BirthDateSheetProps) {
  const theme = useTheme();
  const [value, setValue] = useState('');
  const valid = VALID.test(value.trim());

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: theme.radii.xl,
              backgroundColor: theme.colors.accentMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="sparkle" size={34} color={theme.colors.accent} decorative />
          </View>
          <Text variant="title" style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
            When were you born?
          </Text>
          <Text variant="body" tone="secondary" style={{ textAlign: 'center', marginTop: theme.spacing.sm, maxWidth: 300 }}>
            Your birth day sets your day-pillar — so your fortune is tuned to you, not everyone.
          </Text>
        </View>

        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.colors.textTertiary}
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
          maxLength={10}
          accessibilityLabel="Birth date, year month day"
          style={{
            fontFamily: theme.fonts.body,
            fontSize: theme.typography.bodyLarge.fontSize,
            textAlign: 'center',
            letterSpacing: 2,
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surfaceSunken,
            borderRadius: theme.radii.lg,
            borderWidth: theme.strokes.hairline,
            borderColor: theme.colors.border,
            paddingVertical: theme.spacing.md,
          }}
        />
        <Button
          label="See my fortune"
          variant="primary"
          fullWidth
          loading={busy}
          disabled={!valid}
          style={{ marginTop: theme.spacing.md }}
          onPress={() => onSave(value.trim())}
        />
      </View>

      <Button label="Skip for now" variant="ghost" fullWidth style={{ marginBottom: theme.spacing.md }} onPress={onSkip} />
    </Screen>
  );
}
