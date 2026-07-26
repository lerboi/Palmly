// pulse-generate (Audit-5 · 03 §3) — secret (nightly cron-invoked). Generates the next day's
// Today's Line content for every feature key × locale and upserts into `pulse_templates`
// (pk (pulse_date, feature_key, locale)).
//
// Idempotent: by default a re-run generates only the feature keys that are MISSING — a cheap retry
// after a bad night; `{"force":true}` re-generates all 15. One sync generateContent per feature,
// PULSE_CONCURRENCY at a time. A partial day is a FAILED day and NAMES what is missing (the M3
// lesson, inherited verbatim from fortune-generate): tomorrow, any user whose feature landed on a
// missing key opens the app to an error card, so a 200 with a `failed` count would just hide the
// hole until users found it.
//
// Cost: 15 calls × (~1K in / ~400 out) on Flash-Lite ≈ $0.03–0.06/day, DAU-independent — cheaper
// than the existing 61-bucket fortune run it sits beside.
import { type SupabaseClient } from '@supabase/supabase-js';
import { withRetry } from '../_shared/gemini.ts';
import { branchAnimal, dayPillar } from '../_shared/pillar.ts';
import { generatePulseDay, PULSE_MODEL, PULSE_PROMPT_VERSION, pulseDayComplete } from '../_shared/pulse-generate.ts';
import type { GeminiCall, GeminiResponse } from '../_shared/narrative.ts';
import { createContext, requireMode } from '../_shared/context.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { writeTelemetry } from '../_shared/telemetry.ts';

import { SYSTEM_INSTRUCTION as PULSE_PREFIX } from '../../../prompts/pulse/v1/system_instruction.generated.ts';

function realGeminiCall(): GeminiCall {
  const key = Deno.env.get('GEMINI_API_KEY') ?? '';
  return async (body) => {
    const res = await withRetry(() =>
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/${PULSE_MODEL}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
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

// Which feature keys already exist for (date, locale) — the resume set. A failure here is NOT
// downgraded into "generate all 15 again": the cheap read is what makes the retry cheap, so if we
// cannot tell what is missing we say so and let the (idempotent) re-run do it.
async function existingKeys(admin: SupabaseClient, date: string, locale: string): Promise<string[]> {
  const { data, error } = await admin.from('pulse_templates').select('feature_key').eq('pulse_date', date).eq('locale', locale);
  if (error) throw new AppError('pulse_resume_read_failed', error.message, 500);
  return ((data ?? []) as { feature_key: string }[]).map((r) => r.feature_key);
}

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'secret');
    const body = (await req.json().catch(() => ({}))) as { date?: string; locale?: string; force?: boolean };
    const date = body.date ?? nextUtcDate();
    const locale = body.locale ?? 'en';
    const started = Date.now();

    // The DATE's own pillar — not a birth-date bucket. This is the whole reason the matrix is 15
    // rows instead of 900, and the reason a user who skipped their birth date still gets a real one.
    const pillar = dayPillar(date);
    if (!pillar) throw new AppError('pulse_bad_date', `unparseable date ${date}`, 400);

    const result = await generatePulseDay({
      date,
      locale,
      dayPillar: pillar.day_pillar,
      element: pillar.element,
      animal: branchAnimal(pillar.index),
      systemInstruction: PULSE_PREFIX,
      geminiCall: realGeminiCall(),
      existing: () => existingKeys(ctx.admin, date, locale),
      force: body.force === true,
      upsert: (featureKey, content) =>
        ctx.admin.from('pulse_templates').upsert(
          {
            pulse_date: date,
            feature_key: featureKey,
            locale,
            day_pillar: pillar.day_pillar,
            content,
            model_id: PULSE_MODEL,
            prompt_version: PULSE_PROMPT_VERSION,
          },
          { onConflict: 'pulse_date,feature_key,locale' },
        ),
    });

    const complete = pulseDayComplete(result);
    await writeTelemetry(ctx.admin, {
      worker: 'pulse-generate',
      status: complete ? 'ok' : 'failed',
      model_latency_ms: Date.now() - started,
      detail: { date, locale, generated: result.generated, skipped: result.skipped, missing: result.missing },
    });

    if (!complete) {
      throw new AppError(
        'pulse_incomplete',
        `${result.missing.length} of ${result.total} features missing for ${date}/${locale}`,
        500,
        result,
      );
    }
    return jsonResponse(result);
  }),
);
