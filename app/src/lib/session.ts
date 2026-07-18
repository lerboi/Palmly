import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Returning-user session flags (audit F0.7). Persisted locally so a relaunch lands on the daily
 * fortune home instead of forever replaying first-run onboarding — the retention loop's front door.
 */
const FIRST_READING_KEY = 'palmly.first_reading_complete.v1';

/** Mark that the user has seen at least one real reveal (set when a reveal first renders). */
export async function setFirstReadingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(FIRST_READING_KEY, '1');
  } catch {
    /* best-effort — never crash the reveal over storage */
  }
}

export async function hasFirstReadingComplete(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(FIRST_READING_KEY)) === '1';
  } catch {
    return false;
  }
}
