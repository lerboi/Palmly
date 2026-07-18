import { supabase } from './supabase';
import type { Fortune } from '@/features/fortune/fortune';

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
