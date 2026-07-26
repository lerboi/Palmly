/**
 * RF1.T4 verify (Deno) — generate a REAL day of Today's Line content and check the three things that
 * cannot be checked with a mock: the model produces schema-valid JSON for every feature, none of it
 * trips the banned-claims audit, and **every essence actually names its feature** (the one property
 * that separates this surface from a horoscope, 01 §0).
 *
 * Offline by default (mock — structural only); `--live` hits Gemini for the real tone/claims read.
 *   deno run --allow-read --allow-env --allow-net --config supabase/functions/deno.json eval/rf.ts --live
 *   …--live --full   generates all 15 features instead of the 4-feature sample.
 */
import { branchAnimal, dayPillar } from '../supabase/functions/_shared/pillar.ts';
import { essenceNamesFeature, FEATURE_LABEL, generatePulse, PULSE_MODEL } from '../supabase/functions/_shared/pulse-generate.ts';
import { PULSE_FEATURE_KEYS } from '../supabase/functions/_shared/pulse.ts';
import { bannedHits, type GeminiResponse } from '../supabase/functions/_shared/narrative.ts';
import { withRetry } from '../supabase/functions/_shared/gemini.ts';

const prompt = await Deno.readTextFile(new URL('../prompts/pulse/v1/system_instruction.md', import.meta.url));
let ok = true;
const fail = (m: string) => {
  console.log('FAIL', m);
  ok = false;
};

const live = Deno.args.includes('--live');
const full = Deno.args.includes('--full');
// A palm line, a non-line palm feature, and two face features — enough to hear whether the voice
// really changes with the lens, without paying for 15 calls on every run.
const keys = full ? [...PULSE_FEATURE_KEYS] : ['heart', 'hand_shape', 'eyebrows', 'canthus'];

const DATE = '2026-08-01';
const pillar = dayPillar(DATE)!;

const key = live
  ? (Deno.env.get('GEMINI_API_KEY') ??
    (await Deno.readTextFile(new URL('../.env.staging', import.meta.url)).catch(() => ''))
      .split(/\r?\n/)
      .find((l) => l.startsWith('GEMINI_API_KEY='))
      ?.split('=')
      .slice(1)
      .join('=')
      .trim())
  : undefined;

const mockCall = (featureKey: string) => (): Promise<GeminiResponse> =>
  Promise.resolve({
    candidates: [
      {
        finishReason: 'STOP',
        content: {
          parts: [
            {
              text: JSON.stringify({
                essence: `Your ${FEATURE_LABEL[featureKey]} favours patience today.`,
                reading: 'A day the tradition reads slowly. Nothing is asking to be forced.',
                career: 'Steady focus moves a stalled task.',
                love: 'A warm word lands better than a grand one.',
                wealth: 'A day that favours holding rather than chasing.',
                watch: 'Notice the urge to explain yourself twice.',
                chapter_tone: 'A stretch that rewards steadiness.',
              }),
            },
          ],
        },
      },
    ],
    usageMetadata: {},
  });

const liveCall = () => async (body: unknown): Promise<GeminiResponse> => {
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

if (live && !key) {
  console.log('SKIP --live: no GEMINI_API_KEY');
} else {
  console.log(`${DATE} — ${pillar.day_pillar} (${pillar.element} ${branchAnimal(pillar.index)}) · ${keys.length} features${live ? ' · LIVE' : ' · mock'}`);
  for (const featureKey of keys) {
    const r = await generatePulse({
      date: DATE,
      featureKey,
      dayPillar: pillar.day_pillar,
      element: pillar.element,
      animal: branchAnimal(pillar.index),
      locale: 'en',
      systemInstruction: prompt,
      geminiCall: live ? liveCall() : mockCall(featureKey),
    });
    if (!r.ok) {
      fail(`${featureKey}: ${r.failureReason} ${r.detail ?? ''}`);
      continue;
    }
    const essence = String(r.content.essence);
    // generatePulse already enforces all three; re-asserting here makes the eval's OUTPUT the
    // evidence, so a human reading the log can see the properties rather than trust the exit code.
    if (essence.length > 90) fail(`${featureKey}: essence ${essence.length} chars (>90)`);
    if (!essenceNamesFeature(essence, featureKey)) fail(`${featureKey}: essence does not name the feature`);
    const hits = bannedHits(Object.values(r.content).join('\n'));
    if (hits.length) fail(`${featureKey}: banned claim ${hits.join(',')}`);
    console.log(`OK   ${featureKey.padEnd(11)} "${essence}"`);
    if (live) console.log(`     watch: ${r.content.watch}`);
  }
}

console.log(ok ? 'RF_OK' : 'RF_FAIL');
Deno.exit(ok ? 0 : 1);
