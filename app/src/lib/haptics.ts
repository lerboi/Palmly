import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback (audit F1.11, redesign §5.6). Deliberately kept ON under Reduce Motion — haptics
 * are a distinct accessibility channel from *visual* motion, and the spec wants tactile confirmation
 * to survive the reduce-motion setting. No-op on web (no haptics API). Every call is fire-and-forget
 * and swallows errors — a haptic must never break the interaction it accompanies.
 */
const enabled = Platform.OS !== 'web';

function fire(run: () => Promise<unknown>): void {
  if (!enabled) return;
  void run().catch(() => {
    /* haptics are best-effort — a failure is never surfaced */
  });
}

/** A light tick — button / card press-in. */
export const tick = (): void => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
/** A selection change — chips, toggles, segmented pickers. */
export const select = (): void => fire(() => Haptics.selectionAsync());
/** A firmer stamp — the share seal-stamp confirm. */
export const stamp = (): void => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
/** A success pattern — the pair-score landing / a completed peak moment. */
export const success = (): void => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
