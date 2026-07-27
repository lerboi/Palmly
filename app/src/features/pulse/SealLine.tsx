import { View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { sealLineText } from './streak';

/**
 * The measured line under the week strip (Audit-5 · 05 §4, RF6.T3).
 *
 * **Why this replaced "{n}-day streak".** Every horoscope app can assert. Palmly can *verify*: the
 * on-device ritual re-checks this hand against the enrolled signature, for free, with no server and
 * no photo. "Day 47 · your lines hold" is a **measured** sentence, and no competitor can produce it
 * because none of them has an enrolled biometric to re-check. `06` §2.5 is the evidence: for apps
 * built on a scan the reviews do not punish repetition — they punish non-determinism and fake
 * measurement ("I scanned my dog’s paws and it gave a reading"; "7 readings back to back, 7
 * different results"). A deterministic same-palm check answers that directly, so it belongs on the
 * screen every day rather than hidden inside a card the reader has not opened yet.
 *
 * The two variants and the honesty rule behind them live in {@link sealLineText}.
 */
export interface SealLineProps {
  /** The run, as the server computed it. */
  streak: number;
  /** Did the current run include a real camera seal? (`palmHeldInRun`.) */
  palmHeld: boolean;
}

export function SealLine({ streak, palmHeld }: SealLineProps) {
  const theme = useTheme();
  const label = sealLineText(streak, palmHeld);
  if (!label) return null;
  return (
    <View
      accessibilityRole="text"
      // The full claim, spoken as a sentence — a screen reader should hear what the line means,
      // not "Day 12" floating beside a row of dots.
      accessibilityLabel={palmHeld && streak >= 2 ? `Day ${streak}. Your lines hold.` : label}
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.sm }}
    >
      {/* The chop for a measured run, the flame for a counted one — the same earned difference the
          week strip already draws between a sealed day and a tapped one. Ink either way: this is
          not an action, and the accent litmus has to hold. */}
      <Icon name={palmHeld ? 'seal' : 'streak'} size={14} color={theme.colors.textSecondary} decorative />
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
    </View>
  );
}
