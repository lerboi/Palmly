import { supabase } from './supabase';
import { elementProfile, pillarBucket, type Fortune } from '@/features/fortune/fortune';
import { localDateKey } from '@/features/fortune/openHistory';
import { deviceLocale } from './locale';

/**
 * Daily-fortune read (audit F0.3, Backend §3.2). The nightly `fortune-generate` upserts one
 * `fortune_templates` row per (UTC date × pillar_bucket × locale); the stored `content` jsonb IS the
 * client {@link Fortune} shape 1:1 (schemas/fortune.v1.json). RLS lets any authenticated user read
 * the shared templates. A fresh profile (no birth date until F1.T3) matches the `generic` bucket.
 * Returns null when the day's row isn't generated yet — the caller shows its calm empty state, never
 * fabricated content.
 */

/**
 * Today's fortune, keyed on the caller's **LOCAL** date (Audit-4 SH-14).
 *
 * It used to fetch by `new Date().toISOString().slice(0,10)` — a UTC day — while the header
 * rendered the LOCAL weekday, date and pillar. For much of the day in UTC±8..12 those are different
 * days, so the user read "Saturday July 25" above Friday's fortune. One shared `localDateKey()`
 * (the same helper the week strip uses) now drives both.
 *
 * Locale: the body was hardcoded `'en'` while the header localized off the device. The device
 * language is tried first and falls back to `en`, since `fortune_templates` only has rows for the
 * locales the generator has run for — a missing translation must not become a missing fortune.
 */
export async function loadTodayFortune(bucket = 'generic', locale?: string): Promise<Fortune | null> {
  const wanted = locale ?? deviceLocale()?.split('-')[0] ?? 'en';
  const date = localDateKey(new Date());

  const read = async (loc: string) => {
    const { data, error } = await supabase
      .from('fortune_templates')
      .select('content')
      .eq('fortune_date', date)
      .eq('pillar_bucket', bucket)
      .eq('locale', loc)
      .maybeSingle();
    return error || !data ? null : (data as { content: Fortune }).content;
  };

  const hit = await read(wanted);
  return hit ?? (wanted === 'en' ? null : await read('en'));
}

/**
 * The caller's fortune context (audit F1.3): their stored `birth_date` and the pillar bucket it maps
 * to. A null `birthDate` means the birth-date sheet hasn't been answered → the caller shows it and
 * reads the `generic` bucket until then.
 */
export interface FortuneContext {
  birthDate: string | null;
  bucket: string;
}

export async function loadFortuneContext(): Promise<FortuneContext> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) return { birthDate: null, bucket: 'generic' };
  const { data: row } = await supabase.from('profiles').select('birth_date').eq('id', uid).maybeSingle();
  const birthDate = (row as { birth_date?: string | null } | null)?.birth_date ?? null;
  return { birthDate, bucket: pillarBucket(birthDate) };
}

/**
 * Store the birth date on the profile (audit F1.3) — feeds the day-pillar fortune bucket. Also writes
 * the derived `element_profile` jsonb (mirrors the backend). Returns the pillar bucket, or null on
 * failure. Skippable at the call site (a null/blank date is simply not written).
 */
export async function saveBirthDate(birthDate: string): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return null;
    const { error } = await supabase
      .from('profiles')
      .update({ birth_date: birthDate, element_profile: elementProfile(birthDate) })
      .eq('id', uid);
    if (error) return null;
    return pillarBucket(birthDate);
  } catch {
    return null;
  }
}
