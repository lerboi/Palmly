/**
 * RF1.T4 verify (Deno) — generate a REAL day of Today's Line content and check the things that
 * cannot be checked with a mock: the model produces schema-valid JSON for every feature, none of it
 * trips the banned-claims audit, **every essence names its feature** (the one property that
 * separates this surface from a horoscope, 01 §0), and — since RF6.T1 — that fifteen features come
 * back as fifteen SENTENCES rather than one skeleton with the nouns swapped.
 *
 * Offline by default (mock — structural only); `--live` hits Gemini for the real tone/claims read.
 *   deno run --allow-read --allow-env --allow-net --config supabase/functions/deno.json eval/rf.ts --live
 *   …--live --full   generates all 15 features instead of the 4-feature sample.
 *
 * The structural gate catches COLLISIONS, not dullness. It is a floor, not a verdict — RF6.T1's
 * Verify requires a human to read the fifteen lines printed at the end and say whether they sound
 * like fifteen different sentences.
 */
import { branchAnimal, dayPillar } from '../supabase/functions/_shared/pillar.ts';
import { essenceNamesDay, essenceNamesFeature, FEATURE_LABEL, generatePulse, PULSE_MODEL, pulseComposition } from '../supabase/functions/_shared/pulse-generate.ts';
import { PULSE_FEATURE_KEYS } from '../supabase/functions/_shared/pulse.ts';
import { bannedHits, type GeminiResponse } from '../supabase/functions/_shared/narrative.ts';
import { withRetry } from '../supabase/functions/_shared/gemini.ts';

// ── The structural-repetition gate (RF6.T1) ──────────────────────────────────────────────────────

/**
 * Words whose trailing `s` is part of the word. Without this the crude lemmatizer turns `this` into
 * `thi`, which is harmless on its own but makes the printed signatures unreadable when a human is
 * trying to see WHY two lines collided.
 */
const NOT_PLURAL = new Set(['this', 'his', 'its', 'was', 'has', 'is', 'as', 'us', 'less', 'unless', 'always', 'perhaps', 'yours', 'across', 'toward', 'towards']);

const lemma = (t: string): string => (t.length > 3 && !t.endsWith('ss') && t.endsWith('s') && !NOT_PLURAL.has(t) ? t.slice(0, -1) : t);

const tokenize = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s'’-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/** Every word the feature goes by, so stripping the label cannot depend on which name the model used. */
function labelTokens(featureKey: string): Set<string> {
  const names = [FEATURE_LABEL[featureKey] ?? featureKey, featureKey.replace(/_/g, ' ')];
  return new Set(names.flatMap(tokenize).map(lemma));
}

export interface EssenceSignature {
  featureKey: string;
  essence: string;
  /** First four tokens with the feature's own name removed — the opening construction. */
  prefix: string;
  /** The token the feature governs. v2 mandates the feature as the grammatical subject, so the
   *  word immediately after its label IS the main verb — derived from the prompt rule, not guessed. */
  verb: string;
  /** Prefix + verb. Two essences with the same signature are the same sentence wearing two nouns. */
  signature: string;
  /** The trailing prepositional construction, reported (never failed on) as reading material. */
  tail: string;
}

const TAIL_PREPOSITIONS = /\b(under|with|beneath|amid|through|against|of|on|in)\b/;

export function signEssence(featureKey: string, essence: string): EssenceSignature {
  const toks = tokenize(essence).map(lemma);
  const label = labelTokens(featureKey);

  // The main verb: the token after the LAST label word ("heart line favors" → "favors"). Falls back
  // to the token after "your", then to the second token, so a sentence that opens some other way
  // still yields a comparable signature instead of an empty one.
  let verb = '';
  for (let i = toks.length - 1; i >= 0; i--) {
    if (label.has(toks[i]) && toks[i + 1]) {
      verb = toks[i + 1];
      break;
    }
  }
  if (!verb) {
    const y = toks.indexOf('your');
    verb = (y >= 0 ? toks[y + 1] : toks[1]) ?? '';
  }

  const stripped = toks.filter((t) => !label.has(t));
  const prefix = stripped.slice(0, 4).join(' ');
  const at = stripped.findIndex((t) => TAIL_PREPOSITIONS.test(t));
  const tail = at >= 0 ? stripped.slice(at).join(' ') : '';
  return { featureKey, essence, prefix, verb, signature: `${prefix}|${verb}`, tail };
}

export interface GateVerdict {
  ok: boolean;
  failures: string[];
  warnings: string[];
  signatures: EssenceSignature[];
  /** How many essences share their signature with at least one other. */
  collided: number;
  /** `collided` above this fails. 3-of-15 as specified in 05 §3, scaled for shorter runs. */
  allowed: number;
}

/**
 * FAIL if more than 3 of 15 essences collide, or if any essence names the day.
 *
 * The day-name check is the one that kills v1's tail construction outright: every one of the four
 * quoted failures in 05 §0 ends "…of this Fire Goat day", and none of them can survive a rule that
 * bans `Fire` and `Goat` from the free line. The signature check kills the head.
 */
export function structuralGate(
  rows: { featureKey: string; essence: string }[],
  day: { element: string; animal: string; pillar: string },
): GateVerdict {
  const signatures = rows.map((r) => signEssence(r.featureKey, r.essence));
  const failures: string[] = [];
  const warnings: string[] = [];

  const counts = new Map<string, string[]>();
  for (const s of signatures) counts.set(s.signature, [...(counts.get(s.signature) ?? []), s.featureKey]);
  const collided = [...counts.values()].filter((g) => g.length > 1).reduce((n, g) => n + g.length, 0);
  const allowed = Math.floor(rows.length / 5); // 15 → 3, exactly as specified
  if (collided > allowed) {
    failures.push(`structural repetition: ${collided}/${rows.length} essences share an opening (max ${allowed})`);
    for (const [sig, group] of counts) if (group.length > 1) failures.push(`  collision "${sig}" ← ${group.join(', ')}`);
  }

  // The day may inform the tone. It may not appear in the free line — that is the whole reframe:
  // the palm did not change today, so the day is the light, not the subject. Delegated to the
  // generator's own `essenceNamesDay`, so the eval and production cannot drift into two rules.
  for (const s of signatures) {
    const named = essenceNamesDay(s.essence, { element: day.element, animal: day.animal, dayPillar: day.pillar });
    if (named) failures.push(`${s.featureKey}: essence names the day ("${named}") — ${s.essence}`);
  }

  // Reported, never failed on: a shared tail is v1's other tell, but a legitimate "…than the
  // argument does" can repeat innocently. The human read decides.
  const tails = new Map<string, string[]>();
  for (const s of signatures) if (s.tail) tails.set(s.tail, [...(tails.get(s.tail) ?? []), s.featureKey]);
  for (const [tail, group] of tails) if (group.length > 1) warnings.push(`shared tail "${tail}" ← ${group.join(', ')}`);

  return { ok: failures.length === 0, failures, warnings, signatures, collided, allowed };
}

/**
 * The gate's own teeth, checked against the REAL v1 output quoted in 05 §0 (a Fire Goat day).
 *
 * Without this the gate is only ever exercised by a mock this same file wrote — which proves the
 * plumbing and nothing else. These four sentences are the defect RF6.T1 exists to kill, so a gate
 * that passes them is broken no matter what the mock says.
 */
function selfTest(): boolean {
  const v1 = [
    { featureKey: 'heart', essence: 'Your heart line glows with extra warmth under the Fire Goat’s gentle, flickering light.' },
    { featureKey: 'hand_shape', essence: 'Your hand shape finds a new, radiant clarity under the warmth of this Fire Goat day.' },
    { featureKey: 'proportion', essence: 'Your proportions find a new, radiant harmony under this Fire Goat day.' },
    { featureKey: 'ears', essence: 'Your ears catch the subtle rhythms of this Fire Goat day with grace and clarity.' },
  ];
  const v = structuralGate(v1, { element: 'fire', animal: 'Goat', pillar: '丁未' });
  // Distinct features flagged, not raw failure lines — each of these trips BOTH the animal and the
  // element rule, so counting lines would count the same sentence twice.
  const namesDay = new Set(v.failures.filter((f) => f.includes('names the day')).map((f) => f.split(':')[0])).size;
  const ok = !v.ok && namesDay === 4 && v.collided >= 2;
  console.log(
    ok
      ? `gate self-test OK — rejects v1's own output (${namesDay}/4 name the day, ${v.collided} structural collisions)`
      : `gate self-test FAILED — the gate does not reject v1's output: ${JSON.stringify(v.failures)}`,
  );
  return ok;
}

// ── The run ──────────────────────────────────────────────────────────────────────────────────────

const prompt = await Deno.readTextFile(new URL('../prompts/pulse/v2/system_instruction.md', import.meta.url));
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
const animal = branchAnimal(pillar.index);

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

/**
 * Structurally distinct mock output — a different opening for every one of the fifteen features.
 *
 * A mock that returned the same sentence fifteen times would fail the new gate on every offline
 * run; a mock that cycled six shapes across fifteen features would fail it too, for a reason that
 * says nothing about the model. This is what v2 asks the model for, written by hand, so the offline
 * run exercises the gate's plumbing end to end. `selfTest()` above is what proves the gate has
 * teeth — this only proves it does not misfire.
 */
const MOCK_ESSENCE: Record<string, string> = {
  heart: 'Your heart line would rather be sure than be first.',
  head: 'Your head line drafts the letter twice before sending it once.',
  life: 'A steady life line is read as stamina, not as speed.',
  fate: 'Your fate line asks for a direction, not a decision.',
  hand_shape: 'The square hand shape trusts what it can measure.',
  mounts: 'Your mounts carry more warmth than they advertise.',
  markings: 'A star among your markings marks weight, never luck.',
  face_shape: 'Your elemental face keeps a longer memory than the room does.',
  proportion: 'Nothing in your proportions is in a hurry to be noticed.',
  eyes: 'Your eyes finish the sentence your mouth is still starting.',
  eyebrows: 'Your brows settle a question the rest of you is still turning over.',
  nose: 'Your nose is built for the long approach, not the quick one.',
  mouth: 'Your mouth spends words the way a careful person spends coin.',
  ears: 'Your ears keep the argument long after the room has dropped it.',
  canthus: 'The under-eye softens what the jaw would rather state flatly.',
};

const mockCall = (featureKey: string) => (): Promise<GeminiResponse> => {
  const label = FEATURE_LABEL[featureKey] ?? featureKey;
  const essence = MOCK_ESSENCE[featureKey] ?? `Your ${label} keeps its own counsel.`;
  return Promise.resolve({
    candidates: [
      {
        finishReason: 'STOP',
        content: {
          parts: [
            {
              text: JSON.stringify({
                essence,
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
};

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

if (!selfTest()) fail('the structural gate does not reject v1 output — fix the gate before trusting a pass');

const produced: { featureKey: string; essence: string }[] = [];

if (live && !key) {
  console.log('SKIP --live: no GEMINI_API_KEY');
} else {
  console.log(`${DATE} — ${pillar.day_pillar} (${pillar.element} ${animal}) · ${keys.length} features${live ? ' · LIVE' : ' · mock'} · prompt v2`);
  for (const featureKey of keys) {
    const r = await generatePulse({
      date: DATE,
      featureKey,
      dayPillar: pillar.day_pillar,
      element: pillar.element,
      animal,
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
    produced.push({ featureKey, essence });
    const comp = pulseComposition(featureKey, DATE);
    console.log(`OK   ${featureKey.padEnd(11)} [${comp.shape}/${comp.stance}] "${essence}"`);
    if (live) console.log(`     watch: ${r.content.watch}`);
  }
}

if (produced.length) {
  const verdict = structuralGate(produced, { element: pillar.element, animal, pillar: pillar.day_pillar });
  console.log(`\n── structural gate ── ${verdict.collided}/${produced.length} colliding (max ${verdict.allowed})`);
  for (const s of verdict.signatures) console.log(`  ${s.featureKey.padEnd(11)} ${s.signature}`);
  for (const w of verdict.warnings) console.log(`  WARN ${w}`);
  for (const f of verdict.failures) fail(f);

  // The human read (RF6.T1's Verify). The gate cannot see dullness — print the lines together, in
  // one block, which is the only way to hear whether they are fifteen sentences or one.
  console.log('\n── read these as a week ──');
  produced.forEach((p, i) => console.log(`  ${String(i + 1).padStart(2)}. ${p.essence}`));
}

console.log(ok ? '\nRF_OK' : '\nRF_FAIL');
Deno.exit(ok ? 0 : 1);
