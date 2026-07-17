// fortune-generate (Backend §4, §10, §3.2) — secret (nightly cron-invoked). Generates the next
// day's almanac fortune for every pillar_bucket (60 sexagenary + generic) × locale and upserts into
// `fortune_templates` (pk (fortune_date, pillar_bucket, locale)). Idempotent: by default a re-run
// generates only the buckets that are MISSING (cheap retry after a bad night); `{"force":true}`
// re-generates all 61. MVP path is one sync generateContent per bucket (text → works on the current
// key), FORTUNE_CONCURRENCY at a time; at scale these fold into one Gemini Batch job (50% off) once
// paid-tier (H4c) — the request construction is ready (`buildFortuneBatch`). Still best-effort per
// bucket (one failure never aborts the other 60), but a partial day now NAMES the missing buckets
// and returns 500 rather than a 200 nobody reads (audit M3). The nightly cron invocation is
// deploy-wired (net.http_post, like the queue drains).
import { type SupabaseClient } from '@supabase/supabase-js';
import { withRetry } from '../_shared/gemini.ts';
import { allPillarBuckets } from '../_shared/pillar.ts';
import { FORTUNE_MODEL, FORTUNE_PROMPT_VERSION, fortuneDayComplete, generateFortuneDay } from '../_shared/fortune.ts';
import type { GeminiCall, GeminiResponse } from '../_shared/narrative.ts';
import { createContext, requireMode } from '../_shared/context.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { writeTelemetry } from '../_shared/telemetry.ts';

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

// Which buckets already exist for (date, locale) — the resume set. A failure here is NOT downgraded
// into "generate all 61 again": the cheap read is what makes the retry cheap, so if we cannot tell
// what is missing we say so and let the (idempotent) re-run do it.
async function existingBuckets(admin: SupabaseClient, date: string, locale: string): Promise<string[]> {
  const { data, error } = await admin
    .from('fortune_templates')
    .select('pillar_bucket')
    .eq('fortune_date', date)
    .eq('locale', locale);
  if (error) throw new AppError('fortune_resume_read_failed', error.message, 500);
  return ((data ?? []) as { pillar_bucket: string }[]).map((r) => r.pillar_bucket);
}

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'secret');
    const body = (await req.json().catch(() => ({}))) as { date?: string; locale?: string; force?: boolean };
    const date = body.date ?? nextUtcDate();
    const locale = body.locale ?? 'en';
    const started = Date.now();

    const result = await generateFortuneDay({
      date,
      locale,
      systemInstruction: FORTUNE_PREFIX,
      buckets: allPillarBuckets(),
      geminiCall: realGeminiCall(),
      existing: () => existingBuckets(ctx.admin, date, locale),
      // `force` re-generates a bucket that already exists (the header's "a re-run refreshes the same
      // rows"); the default resumes, which is what the nightly cron and its retry want.
      force: body.force === true,
      upsert: (bucket, content) =>
        ctx.admin.from('fortune_templates').upsert(
          { fortune_date: date, pillar_bucket: bucket, locale, content, model_id: FORTUNE_MODEL, prompt_version: FORTUNE_PROMPT_VERSION },
          { onConflict: 'fortune_date,pillar_bucket,locale' },
        ),
    });

    const complete = fortuneDayComplete(result);
    await writeTelemetry(ctx.admin, {
      worker: 'fortune-generate',
      status: complete ? 'ok' : 'failed',
      model_latency_ms: Date.now() - started,
      detail: { date, locale, generated: result.generated, skipped: result.skipped, missing: result.missing },
    });

    // A partial day is a FAILED day: tomorrow, every user whose pillar bucket is in `missing` opens
    // the app to no fortune. Returning 200 with a `failed` count told the cron the night went fine
    // and left the hole to be discovered by users — so the shortfall is now the status.
    if (!complete) {
      throw new AppError(
        'fortune_incomplete',
        `${result.missing.length} of ${result.total} buckets missing for ${date}/${locale}`,
        500,
        result,
      );
    }
    return jsonResponse(result);
  }),
);
