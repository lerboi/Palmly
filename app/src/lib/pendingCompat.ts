import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The most-recent compat invite the user SENT, persisted locally (audit F1.7). The raw invite URL
 * only exists at mint time (the server stores a hash), so the home red-thread card can only re-share
 * the SAME link — never mint a second — by reading it back from here. Cleared when the pair resolves.
 */
export interface PendingCompat {
  url: string;
  sentAtISO: string;
  partnerName?: string; // usually unknown until the recipient claims
}

const KEY = 'palmly.pending_compat.v1';

/** Persist the just-minted compat invite. The mint time is stamped HERE (a lib module, not a React
 *  render/effect) so callers never touch an argless `new Date()`. */
export async function savePendingCompat(p: { url: string; partnerName?: string }): Promise<void> {
  try {
    const row: PendingCompat = { url: p.url, partnerName: p.partnerName, sentAtISO: new Date().toISOString() };
    await AsyncStorage.setItem(KEY, JSON.stringify(row));
  } catch {
    /* best-effort — a missing pending card is not worth a crash */
  }
}

export async function loadPendingCompat(): Promise<PendingCompat | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingCompat;
    return p && typeof p.url === 'string' && typeof p.sentAtISO === 'string' ? p : null;
  } catch {
    return null;
  }
}

export async function clearPendingCompat(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}
