import AsyncStorage from '@react-native-async-storage/async-storage';
import { localDateKey, recordOpen } from '@/features/fortune/openHistory';

/**
 * Local record of the days the user opened their fortune (Audit-4 SH-9).
 *
 * Client-honest and deliberately local: Design-Direction §4.1 wants a real week rhythm on Today,
 * and the retention BACKEND that would own this is out of scope for this ledger. A device-local
 * list is truthful about what it knows — it undercounts across a reinstall or a second device, and
 * it never invents a run the user didn't have, which is the failure SH-9 actually describes.
 */
const OPENS_KEY = 'palmly.fortune_opens.v1';

/** The stored date keys, newest last. Empty on any read failure — never a fabricated streak. */
export async function loadFortuneOpens(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(OPENS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Mark today as opened and return the updated list (so the caller can render without a re-read). */
export async function markFortuneOpened(now: Date = new Date()): Promise<string[]> {
  const current = await loadFortuneOpens();
  const key = localDateKey(now);
  if (current.includes(key)) return current; // already counted today — no write, no churn
  const next = recordOpen(now, current);
  try {
    await AsyncStorage.setItem(OPENS_KEY, JSON.stringify(next));
  } catch {
    /* a failed write just means today isn't counted — better than a wrong streak */
  }
  return next;
}
