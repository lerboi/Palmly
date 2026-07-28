/**
 * P5.T6 verify (Deno) — the 5 test sets through pass-2 narrative:
 *   1. each sample is a schema-valid feature_set (input sanity);
 *   2. its narrative matches the sections schema (generateNarrative validates internally → ok);
 *   3. regenerating from identical features yields identical CLAIMS (tags/feature_refs/keys),
 *      even though the prose wording differs — the consistency guarantee (§6.6.6);
 *   4. the no-medical-claims audit passes over the generated prose.
 * Offline by default (a stub model → KB-composed bodies, fully deterministic). `--live` runs one
 * real Gemini Flash-Lite call to confirm the real model produces schema-valid output.
 *
 *   deno run --allow-read eval/p5t6.ts
 *   deno run --allow-read --allow-env --allow-net eval/p5t6.ts --live
 */
import {
  bannedHits,
  generateNarrative,
  selectClaims,
  traditionFor,
  NARRATIVE_MODEL,
  type FeatureKind,
  type GeminiResponse,
} from '../supabase/functions/_shared/narrative.ts';
import { validateFeatures } from '../supabase/functions/_shared/schema.ts';
import { withRetry } from '../supabase/functions/_shared/gemini.ts';
import palmKb from '../kb/v1/palmistry.json' with { type: 'json' };
import faceKb from '../kb/v1/physiognomy.json' with { type: 'json' };

const narrativePrompt = await Deno.readTextFile(new URL('../prompts/narrative/v1/system_instruction.md', import.meta.url));

const kbMap = (doc: { chunks: Array<{ feature_key: string; content: string }> }) =>
  new Map(doc.chunks.map((c) => [c.feature_key, c.content]));
const KB = { palmistry: kbMap(palmKb), physiognomy: kbMap(faceKb) };

let ok = true;
const fail = (m: string) => {
  console.log('FAIL', m);
  ok = false;
};

const SAMPLE_DIR = new URL('./samples/narrative/', import.meta.url);
const samples: Array<{ name: string; features: Record<string, unknown>; kind: FeatureKind }> = [];
for await (const e of Deno.readDir(SAMPLE_DIR)) {
  if (!e.isFile || !e.name.endsWith('.json')) continue;
  const features = JSON.parse(await Deno.readTextFile(new URL(e.name, SAMPLE_DIR)));
  samples.push({ name: e.name, features, kind: 'is_face' in features ? 'face' : 'palm' });
}
samples.sort((a, b) => a.name.localeCompare(b.name));
if (samples.length !== 5) fail(`expected 5 sample feature sets, found ${samples.length}`);

// Offline stub: a well-formed but content-free model reply → graft fills bodies from KB references.
const stub = (headline: string) => (): Promise<GeminiResponse> =>
  Promise.resolve({
    candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ headline, sections: [] }) }] } }],
    usageMetadata: { promptTokenCount: 3000, candidatesTokenCount: 800 },
  });

const claimsOf = (n: { sections: Array<{ key: string; tags: string[]; feature_refs: string[] }> }) =>
  JSON.stringify(n.sections.map((s) => ({ key: s.key, tags: s.tags, refs: s.feature_refs })));

for (const s of samples) {
  const kind = s.kind;
  // 1. input is schema-valid
  if (!validateFeatures(kind, s.features).valid) fail(`${s.name}: not a schema-valid ${kind} feature_set`);

  // no orphan keys — every selected claim resolved to a KB passage
  const sel = selectClaims(kind, s.features, KB[traditionFor(kind)]);
  if (sel.missingKeys.length) fail(`${s.name}: KB missing keys ${sel.missingKeys.join(',')}`);

  // 2 + 4. narrative is schema-valid (ok) and passes the content-safety scan (built into generateNarrative)
  const base = { kind, features: s.features, kb: KB[traditionFor(kind)], depthLevel: 2, systemInstruction: narrativePrompt };
  const r1 = await generateNarrative({ ...base, geminiCall: stub('One evocative headline') });
  if (!r1.ok) {
    fail(`${s.name}: narrative not schema-valid/ safe → ${r1.failureReason} ${r1.detail ?? ''}`);
    continue;
  }
  // explicit no-medical audit over the assembled prose (belt & suspenders on top of generateNarrative)
  const prose = [r1.narrative.headline, r1.narrative.summary ?? '', ...r1.narrative.sections.flatMap((x) => [x.title, x.body])].join('\n');
  const hits = bannedHits(prose);
  if (hits.length) fail(`${s.name}: banned phrasing in prose [${hits.join(', ')}]`);

  // 3. identical features → identical claims across a differently-worded regeneration
  const r2 = await generateNarrative({ ...base, geminiCall: stub('A completely different headline, worded another way') });
  if (r2.ok && claimsOf(r1.narrative) !== claimsOf(r2.narrative)) fail(`${s.name}: claims drifted across regenerations`);

  console.log(`OK   ${s.name} (${kind}): ${r1.narrative.sections.length} sections, ${sel.sections.reduce((a, x) => a + x.claims.length, 0)} claims, schema-valid, claims stable, no banned phrasing`);
}

// Optional: one real Gemini Flash-Lite call to prove the live model produces schema-valid output.
if (Deno.args.includes('--live')) {
  const readEnvStaging = async (): Promise<string | undefined> => {
    if (Deno.env.get('GEMINI_API_KEY')) return Deno.env.get('GEMINI_API_KEY');
    try {
      const txt = await Deno.readTextFile(new URL('../.env', import.meta.url));
      return txt.split(/\r?\n/).find((l) => l.startsWith('GEMINI_API_KEY='))?.split('=').slice(1).join('=').trim();
    } catch {
      return undefined;
    }
  };
  const key = await readEnvStaging();
  if (!key) console.log('SKIP --live: no GEMINI_API_KEY');
  else {
    const s = samples[0];
    const call = async (body: unknown): Promise<GeminiResponse> => {
      const res = await withRetry(() =>
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/${NARRATIVE_MODEL}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
      );
      return (await res.json()) as GeminiResponse;
    };
    const live = await generateNarrative({ kind: s.kind, features: s.features, kb: KB[traditionFor(s.kind)], depthLevel: 1, systemInstruction: narrativePrompt, geminiCall: call });
    if (!live.ok) fail(`--live ${s.name}: ${live.failureReason} ${live.detail ?? ''}`);
    else console.log(`OK   --live ${s.name}: real ${NARRATIVE_MODEL} → schema-valid reading, headline="${live.narrative.headline}"`);
  }
}

console.log(ok ? 'P5T6_OK' : 'P5T6_FAIL');
Deno.exit(ok ? 0 : 1);
