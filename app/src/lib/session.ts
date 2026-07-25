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

/**
 * Paywall decline record (audit F1.2). Written locally when the user dismisses the paywall — the
 * trigger the server's already-deployed `winback` notification template consumes (a 24h nudge). Kept
 * client-side (no schema change); a future task can sync it. Stores an ISO timestamp passed by the
 * caller (the render layer can't call the purity-banned `Date.now()`).
 */
const BIRTH_DATE_SKIPPED_KEY = 'palmly.birth_date_skipped.v1';

/**
 * Remember that the user declined the birth-date ask (Audit-4 SH-4). "Skip" used to persist
 * nothing, so the sheet re-nagged on EVERY open, forever. Settings keeps a way back in.
 */
export async function setBirthDateSkipped(): Promise<void> {
  try {
    await AsyncStorage.setItem(BIRTH_DATE_SKIPPED_KEY, '1');
  } catch {
    /* a failed write only means we ask again — never a crash */
  }
}

export async function wasBirthDateSkipped(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(BIRTH_DATE_SKIPPED_KEY)) === '1';
  } catch {
    return false;
  }
}

const PAYWALL_DECLINED_KEY = 'palmly.paywall_declined_at.v1';

export async function setPaywallDeclined(at: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PAYWALL_DECLINED_KEY, at);
  } catch {
    /* best-effort */
  }
}

export async function getPaywallDeclinedAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PAYWALL_DECLINED_KEY);
  } catch {
    return null;
  }
}

/**
 * Whether the user's LATEST scan resolved `matched` — a repeat of a palm/face they've read before
 * (Backend §6.6 consistency; audit F1.10). Set true on a `matched` resolve, false on a fresh
 * `complete`, so the history "your palm is unchanged" brag is EARNED by the real signal, not
 * hardcoded. Local-only (no schema change); the signal originates at the analyzing→reveal seam.
 */
const LAST_SCAN_MATCHED_KEY = 'palmly.last_scan_matched.v1';

export async function setLastScanMatched(matched: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SCAN_MATCHED_KEY, matched ? '1' : '0');
  } catch {
    /* best-effort */
  }
}

export async function getLastScanMatched(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(LAST_SCAN_MATCHED_KEY)) === '1';
  } catch {
    return false;
  }
}
