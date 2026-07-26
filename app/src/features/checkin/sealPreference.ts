import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * "Seal with camera" (Audit-5 · 02 §8) — whether the Today card offers the palm ritual.
 *
 * Device-local on purpose. This is a display preference about a gesture that never leaves the
 * phone; sending it to a server would mean transmitting a fact about someone's use of a feature
 * whose entire selling point is that it transmits nothing.
 *
 * Default ON where supported, and permanently off on web, where there is no camera to offer. Turning
 * it off hides the link and nothing else — the day still seals with a tap, the streak still counts,
 * and no copy anywhere changes. It is a way to decline the flourish, not a feature switch.
 *
 * Note it lives on the Settings hub's **Preferences** group rather than under Notifications
 * (which 02 §8 lists it beside): a camera gesture is not a notification, and filing it under
 * "what we notify you about" would misdescribe it. Deviation logged 2026-07-26.
 */
const KEY = 'palmly.seal_with_camera.v1';

/** Is the camera ritual available on this platform at all? */
export const sealCameraSupported = (): boolean => Platform.OS !== 'web';

export async function sealWithCameraEnabled(): Promise<boolean> {
  if (!sealCameraSupported()) return false;
  try {
    // Absent = never touched = on. Only an explicit '0' turns it off.
    return (await AsyncStorage.getItem(KEY)) !== '0';
  } catch {
    return true;
  }
}

export async function setSealWithCamera(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, enabled ? '1' : '0');
  } catch {
    /* best-effort — a failed write only means the link stays as it was */
  }
}
