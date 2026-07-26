import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { localDateKey } from '@/features/fortune/openHistory';
import { loadFortuneOpens } from './fortuneOpens';
import { currentRun, LEDGER_CAP_DAYS, longestRun, mergeSealed } from '@/features/pulse/streak';

export { currentRun, longestRun, mergeSealed } from '@/features/pulse/streak';

/**
 * The daily ledger (Audit-5 · 03 §6) — what replaces `fortuneOpens.ts` as the truth about which days
 * the user showed up.
 *
 * Why it had to move off the device: the local list undercounted across a reinstall or a second
 * phone, and — more importantly — the morning push has to be able to skip a user who has already
 * sealed today, which no server can know from AsyncStorage. Streaks are also the one number a client
 * must not be able to mint; `record_daily_open` computes them server-side and returns them.
 *
 * What stays local: a small write-behind cache, so the week strip renders instantly on a cold open
 * and still shows something honest offline. The cache is a MIRROR, never the source — every online
 * call reconciles it.
 */

const CACHE_KEY = 'palmly.daily_ledger_cache.v1';
const MIGRATED_KEY = 'palmly.opens_migrated.v1';

export interface LedgerState {
  /** Local date keys the user SEALED (the days a streak counts). */
  sealedDates: string[];
  /** The subset sealed with the camera ritual — the week strip marks those with the chop glyph. */
  palmSealedDates: string[];
  currentStreak: number;
  longestStreak: number;
}

export interface RecordResult extends LedgerState {
  /** This call is what sealed today → the caller may celebrate a milestone. False on a re-seal. */
  firstSealToday: boolean;
  /** The write reached the server. False → the cache moved but the streak is a local estimate. */
  synced: boolean;
}

const EMPTY: LedgerState = { sealedDates: [], palmSealedDates: [], currentStreak: 0, longestStreak: 0 };

// ── Local cache ──────────────────────────────────────────────────────────────────────────────────

export async function loadCachedLedger(): Promise<LedgerState> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<LedgerState>;
    return {
      sealedDates: Array.isArray(parsed.sealedDates) ? parsed.sealedDates.filter((d): d is string => typeof d === 'string') : [],
      palmSealedDates: Array.isArray(parsed.palmSealedDates) ? parsed.palmSealedDates.filter((d): d is string => typeof d === 'string') : [],
      currentStreak: typeof parsed.currentStreak === 'number' ? parsed.currentStreak : 0,
      longestStreak: typeof parsed.longestStreak === 'number' ? parsed.longestStreak : 0,
    };
  } catch {
    return EMPTY;
  }
}

async function writeCache(state: LedgerState): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ...state, sealedDates: state.sealedDates.slice(-LEDGER_CAP_DAYS) }));
  } catch {
    /* a failed cache write only costs a slower next render */
  }
}

// ── Server ───────────────────────────────────────────────────────────────────────────────────────

/**
 * Record a day. `method` absent = merely opened (no streak); `'tap'` or `'palm'` = sealed.
 *
 * Optimistic and offline-safe: the local cache updates whether or not the network answers, so the
 * week strip never blanks out on a bad connection. `synced: false` tells the caller the streak it
 * has is the local estimate — which is why the celebration only fires on the SERVER's
 * `first_seal_today`, never on the estimate.
 */
export async function recordDay(params: {
  bucket: string;
  featureKey?: string | null;
  method?: 'tap' | 'palm' | null;
  revealed?: boolean;
  now?: Date;
}): Promise<RecordResult> {
  const now = params.now ?? new Date();
  const dateKey = localDateKey(now);
  const cached = await loadCachedLedger();

  const optimistic: LedgerState = params.method
    ? {
        ...cached,
        sealedDates: mergeSealed(cached.sealedDates, dateKey),
        palmSealedDates: params.method === 'palm' ? mergeSealed(cached.palmSealedDates, dateKey) : cached.palmSealedDates,
      }
    : cached;

  try {
    const { data, error } = await supabase.rpc('record_daily_open', {
      p_date: dateKey,
      p_bucket: params.bucket,
      p_feature_key: params.featureKey ?? null,
      p_method: params.method ?? null,
      p_revealed: params.revealed === true,
    });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as
      | { current_streak: number; longest_streak: number; first_seal_today: boolean }
      | undefined;
    if (!row) throw new Error('record_daily_open returned no row');

    const next: LedgerState = {
      sealedDates: optimistic.sealedDates,
      palmSealedDates: optimistic.palmSealedDates,
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
    };
    await writeCache(next);
    return { ...next, firstSealToday: row.first_seal_today === true, synced: true };
  } catch {
    // Offline / signed out: keep the optimistic cache so the strip stays truthful about what this
    // device knows, and report `synced: false` so nothing downstream celebrates on a guess.
    await writeCache(optimistic);
    return { ...optimistic, firstSealToday: false, synced: false };
  }
}

/**
 * Read the ledger from the server and refresh the cache. Falls back to the cache on any failure —
 * an empty week strip would claim the user has never shown up, which is a lie, not a null state.
 */
export async function loadLedger(days = 400, now: Date = new Date()): Promise<LedgerState> {
  const cached = await loadCachedLedger();
  try {
    const from = localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - days));
    const { data, error } = await supabase
      .from('user_fortunes')
      .select('fortune_date, sealed_at, seal_method')
      .not('sealed_at', 'is', null)
      .gte('fortune_date', from)
      .order('fortune_date', { ascending: true });
    if (error || !data) return cached;

    const rows = data as { fortune_date: string; seal_method: string | null }[];
    const sealedDates = rows.map((r) => r.fortune_date);
    const next: LedgerState = {
      sealedDates,
      palmSealedDates: rows.filter((r) => r.seal_method === 'palm').map((r) => r.fortune_date),
      currentStreak: currentRun(sealedDates, localDateKey(now)),
      longestStreak: Math.max(longestRun(sealedDates), cached.longestStreak),
    };
    await writeCache(next);
    return next;
  } catch {
    return cached;
  }
}

// ── One-time migration: nobody's streak resets ───────────────────────────────────────────────────

/**
 * Replay the device's old `palmly.fortune_opens.v1` list into the server ledger, once (03 §6).
 *
 * Without this, the day the server ledger ships every existing user's streak silently drops to
 * zero — the app would take away the exact thing this feature is built to grow. The old list is
 * "days the fortune was OPENED", which is the closest honest analogue of a sealed day, so it is
 * replayed as `seal_method='tap'`.
 *
 * It writes `user_fortunes` rows directly (owner RLS) rather than through the RPC, because the RPC
 * deliberately clamps to ±1 day — the clamp exists to stop clients backfilling streaks, and this is
 * the one legitimate backfill there will ever be. It is bounded (400 days), idempotent (the PK
 * absorbs re-runs), and latches a flag so it can never run twice.
 */
export async function migrateLocalOpens(now: Date = new Date()): Promise<{ migrated: number; skipped: boolean }> {
  try {
    if ((await AsyncStorage.getItem(MIGRATED_KEY)) === '1') return { migrated: 0, skipped: true };

    const opens = await loadFortuneOpens();
    const cutoff = localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - LEDGER_CAP_DAYS));
    const dates = [...new Set(opens)].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= cutoff).sort().slice(-LEDGER_CAP_DAYS);

    if (!dates.length) {
      await AsyncStorage.setItem(MIGRATED_KEY, '1');
      return { migrated: 0, skipped: false };
    }

    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user?.id;
    if (!uid) return { migrated: 0, skipped: false }; // not signed in yet — try again next launch

    const stamp = new Date().toISOString();
    const { error } = await supabase.from('user_fortunes').upsert(
      dates.map((d) => ({ user_id: uid, fortune_date: d, pillar_bucket: 'generic', opened_at: stamp, sealed_at: stamp, seal_method: 'tap' })),
      { onConflict: 'user_id,fortune_date', ignoreDuplicates: true },
    );
    if (error) return { migrated: 0, skipped: false }; // leave the flag unset so a later launch retries

    await AsyncStorage.setItem(MIGRATED_KEY, '1');
    // Replayed days were taps, not rituals — the strip must not award a chop nobody earned.
    await writeCache({ sealedDates: dates, palmSealedDates: [], currentStreak: currentRun(dates, localDateKey(now)), longestStreak: longestRun(dates) });
    return { migrated: dates.length, skipped: false };
  } catch {
    return { migrated: 0, skipped: false };
  }
}

/** Test-only: clear the one-time migration latch. */
export const resetMigrationFlagForTests = (): Promise<void> => AsyncStorage.removeItem(MIGRATED_KEY);
