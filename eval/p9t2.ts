/**
 * P9.T2 verify (Deno) — spot-read: generate a few REAL daily fortunes via the sync path
 * (gemini-3.1-flash-lite, text → works on the free-tier key) and confirm each is schema-valid +
 * passes the no-medical/no-financial-advice audit (generateFortune enforces both). Offline by
 * default (mock, structural); `--live` hits Gemini for the real tone/claims spot-read.
 *   deno run --allow-read --allow-env --allow-net --config supabase/functions/deno.json eval/p9t2.ts --live
 */
import { FORTUNE_MODEL, generateFortune } from '../supabase/functions/_shared/fortune.ts';
import { allPillarBuckets } from '../supabase/functions/_shared/pillar.ts';
import type { GeminiResponse } from '../supabase/functions/_shared/narrative.ts';
import { withRetry } from '../supabase/functions/_shared/gemini.ts';

const prompt = await Deno.readTextFile(new URL('../prompts/fortune/v1/system_instruction.md', import.meta.url));
let ok = true;
const fail = (m: string) => {
  console.log('FAIL', m);
  ok = false;
};

// a wood, a fire and a water bucket + generic → cover the element range
const buckets = allPillarBuckets();
const sample = [buckets.find((b) => b.element === 'wood')!, buckets.find((b) => b.element === 'fire')!, buckets.find((b) => b.element === 'water')!, buckets.find((b) => b.bucket === 'generic')!];

const live = Deno.args.includes('--live');
const key = live
  ? (Deno.env.get('GEMINI_API_KEY') ??
    (await Deno.readTextFile(new URL('../.env', import.meta.url)).catch(() => '')).split(/\r?\n/).find((l) => l.startsWith('GEMINI_API_KEY='))?.split('=').slice(1).join('=').trim())
  : undefined;

const mockCall = () => (): Promise<GeminiResponse> =>
  Promise.resolve({
    candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ overall: 'A steady day.', career: 'Focus pays.', love: 'Speak softly.', wealth: 'Favours saving.', do: ['Rest'], dont: ['Rush'], lucky_direction: 'East', lucky_color: 'Jade', lucky_hours: '9–11am' }) }] } }],
    usageMetadata: {},
  });
const liveCall = () => async (body: unknown): Promise<GeminiResponse> => {
  const res = await withRetry(() => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${FORTUNE_MODEL}:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  if (!res.ok) throw new Error(`gemini_http_${res.status}`);
  return (await res.json()) as GeminiResponse;
};

if (live && !key) {
  console.log('SKIP --live: no GEMINI_API_KEY');
} else {
  for (const b of sample) {
    const r = await generateFortune({ date: '2026-07-14', bucket: b.bucket, element: b.element, dayPillar: b.day_pillar, locale: 'en', systemInstruction: prompt, geminiCall: (live ? liveCall() : mockCall()) });
    if (!r.ok) fail(`${b.bucket} (${b.element}): ${r.failureReason} ${r.detail ?? ''}`);
    else console.log(`OK   ${b.bucket} (${b.element})${live ? ` — "${r.content.overall}"` : ''}`);
  }
}

console.log(ok ? 'P9T2_OK' : 'P9T2_FAIL');
Deno.exit(ok ? 0 : 1);
