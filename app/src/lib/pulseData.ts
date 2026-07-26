import { supabase } from './supabase';
import { localDateKey } from '@/features/fortune/openHistory';
import { deviceLocale } from './locale';

/**
 * Today's Line read (Audit-5 · 03 §6). The nightly `pulse-generate` upserts one `pulse_templates`
 * row per (UTC date × feature_key × locale); the stored `content` jsonb IS the client {@link Pulse}
 * shape 1:1 (`schemas/pulse.v1.json`). RLS lets any authenticated user read the shared templates.
 *
 * Keyed on the caller's **LOCAL** date, exactly like `loadTodayFortune` (Audit-4 SH-14): the header
 * above the card renders the local weekday and pillar, so reading a UTC day would show Saturday's
 * line under Friday's heading for a third of the planet.
 *
 * Returns `null` when the day's row isn't generated — the caller shows its honest error state and
 * NEVER fabricates a reading. That is the whole failure contract for this surface (03 §7).
 */
export interface Pulse {
  essence: string;
  reading: string;
  career: string;
  love: string;
  wealth: string;
  watch: string;
  chapter_tone: string;
}

/** One archived day, for the premium archive shelf. */
export interface ArchivedPulse {
  date: string;
  featureKey: string;
  pulse: Pulse;
}

const wantedLocale = (locale?: string): string => locale ?? deviceLocale()?.split('-')[0] ?? 'en';

/**
 * Today's line for one feature. Tries the device language, then falls back to `en` — templates only
 * exist for locales the generator has run for, and a missing TRANSLATION must never become a missing
 * reading.
 */
export async function loadTodayPulse(featureKey: string, locale?: string, now: Date = new Date()): Promise<Pulse | null> {
  const wanted = wantedLocale(locale);
  const date = localDateKey(now);

  const read = async (loc: string): Promise<Pulse | null> => {
    const { data, error } = await supabase
      .from('pulse_templates')
      .select('content')
      .eq('pulse_date', date)
      .eq('feature_key', featureKey)
      .eq('locale', loc)
      .maybeSingle();
    return error || !data ? null : (data as { content: Pulse }).content;
  };

  const hit = await read(wanted);
  return hit ?? (wanted === 'en' ? null : await read('en'));
}

/**
 * The premium archive (01 §6): past days' lines, newest first.
 *
 * Reads the caller's OWN ledger for which feature each past day used — the selection math would
 * give the same answer, but the ledger is what actually happened, and a card in the archive should
 * show what the reader saw, not what a recomputation thinks they saw. Days with no stored template
 * are dropped rather than rendered blank.
 */
export async function loadPulseArchive(days = 30, locale?: string, now: Date = new Date()): Promise<ArchivedPulse[]> {
  const wanted = wantedLocale(locale);
  const from = localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - days));
  const to = localDateKey(now);

  const { data: ledger, error } = await supabase
    .from('user_fortunes')
    .select('fortune_date, pulse_feature_key')
    .not('pulse_feature_key', 'is', null)
    .gte('fortune_date', from)
    .lte('fortune_date', to)
    .order('fortune_date', { ascending: false });
  if (error || !ledger?.length) return [];

  const rows = ledger as { fortune_date: string; pulse_feature_key: string }[];
  const { data: templates } = await supabase
    .from('pulse_templates')
    .select('pulse_date, feature_key, content')
    .in('pulse_date', rows.map((r) => r.fortune_date))
    .in('feature_key', [...new Set(rows.map((r) => r.pulse_feature_key))])
    .in('locale', [wanted, 'en']);

  const byKey = new Map<string, Pulse>();
  for (const t of (templates ?? []) as { pulse_date: string; feature_key: string; content: Pulse }[]) {
    // The device language wins when both locales came back; `en` fills the gaps.
    const k = `${t.pulse_date}:${t.feature_key}`;
    if (!byKey.has(k)) byKey.set(k, t.content);
  }

  return rows
    .map((r) => {
      const pulse = byKey.get(`${r.fortune_date}:${r.pulse_feature_key}`);
      return pulse ? { date: r.fortune_date, featureKey: r.pulse_feature_key, pulse } : null;
    })
    .filter((v): v is ArchivedPulse => v !== null);
}

/**
 * The caller's subject kinds — the ONLY input the feature-selection math takes about the user
 * (03 §4.1). Read from `subject_profiles`, one small indexed column, so the client and the push
 * fan-out are looking at exactly the same fact.
 */
export async function loadSubjectKinds(): Promise<('palm_left' | 'palm_right' | 'face')[]> {
  const { data, error } = await supabase.from('subject_profiles').select('kind');
  if (error || !data) return [];
  return (data as { kind: 'palm_left' | 'palm_right' | 'face' }[]).map((r) => r.kind);
}
