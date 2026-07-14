// fortune-generate (Backend §4, §10, §3.2) — secret (nightly cron-invoked). Generates the next
// day's almanac fortune for every pillar_bucket (60 sexagenary + generic) × locale and upserts into
// `fortune_templates` (pk (fortune_date, pillar_bucket, locale)). Idempotent — a re-run refreshes
// the same rows. MVP path is one sync generateContent per bucket (text → works on the current key);
// at scale these fold into one Gemini Batch job (50% off) once paid-tier (H4c) — the request
// construction is ready (`buildFortuneBatch`). Best-effort per bucket: one failure never aborts the
// rest. The nightly cron invocation is deploy-wired (net.http_post, like the queue drains).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { withRetry } from '../_shared/gemini.ts';
import { allPillarBuckets } from '../_shared/pillar.ts';
import { FORTUNE_MODEL, FORTUNE_PROMPT_VERSION, generateFortune } from '../_shared/fortune.ts';
import type { GeminiCall, GeminiResponse } from '../_shared/narrative.ts';
import { createContext, requireMode } from '../_shared/context.ts';
import { jsonResponse, withErrorEnvelope } from '../_shared/http.ts';

import { SYSTEM_INSTRUCTION as FORTUNE_PREFIX } from '../../../prompts/fortune/v1/system_instruction.generated.ts';

function realGeminiCall(): GeminiCall {
  const key = Deno.env.get('GEMINI_API_KEY') ?? '';
  return async (body) => {
    const res = await withRetry(() =>
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/${FORTUNE_MODEL}:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    );
    if (!res.ok) throw new Error(`gemini_http_${res.status}`);
    return (await res.json()) as GeminiResponse;
  };
}

function nextUtcDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function generateAll(admin: SupabaseClient, date: string, locale: string, geminiCall: GeminiCall) {
  const buckets = allPillarBuckets();
  let generated = 0;
  let failed = 0;
  for (const b of buckets) {
    try {
      const r = await generateFortune({ date, bucket: b.bucket, element: b.element, dayPillar: b.day_pillar, locale, systemInstruction: FORTUNE_PREFIX, geminiCall });
      if (!r.ok) {
        failed++;
        continue;
      }
      const { error } = await admin.from('fortune_templates').upsert(
        { fortune_date: date, pillar_bucket: b.bucket, locale, content: r.content, model_id: FORTUNE_MODEL, prompt_version: FORTUNE_PROMPT_VERSION },
        { onConflict: 'fortune_date,pillar_bucket,locale' },
      );
      error ? failed++ : generated++;
    } catch {
      failed++;
    }
  }
  return { date, locale, generated, failed, total: buckets.length };
}

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'secret');
    const body = (await req.json().catch(() => ({}))) as { date?: string; locale?: string };
    const result = await generateAll(ctx.admin, body.date ?? nextUtcDate(), body.locale ?? 'en', realGeminiCall());
    return jsonResponse(result);
  }),
);
