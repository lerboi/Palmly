import { supabase } from './supabase';
import { elementProfile, pillarBucket, type Fortune } from '@/features/fortune/fortune';

/**
 * Daily-fortune read (audit F0.3, Backend §3.2). The nightly `fortune-generate` upserts one
 * `fortune_templates` row per (UTC date × pillar_bucket × locale); the stored `content` jsonb IS the
 * client {@link Fortune} shape 1:1 (schemas/fortune.v1.json). RLS lets any authenticated user read
 * the shared templates. A fresh profile (no birth date until F1.T3) matches the `generic` bucket.
 * Returns null when the day's row isn't generated yet — the caller shows its calm empty state, never
 * fabricated content.
 */

/** Today's UTC date (YYYY-MM-DD) — the fortune_templates partition key the backend generates against. */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function loadTodayFortune(bucket = 'generic', locale = 'en'): Promise<Fortune | null> {
  const { data, error } = await supabase
    .from('fortune_templates')
    .select('content')
    .eq('fortune_date', todayUtc())
    .eq('pillar_bucket', bucket)
    .eq('locale', locale)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { content: Fortune }).content;
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
