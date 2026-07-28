/**
 * P9.T6 verify (Deno) — the chat legs that need a live model:
 *   (1) a GROUNDED answer to a real question, citing the user's own seeded feature lines, that
 *       passes the no-medical/no-financial audit (gemini-3.1-flash-lite, text → free-tier OK);
 *   (2) a medical question deflects with ZERO model call;
 *   (3) live pgvector retrieval: embed 3 KB contents + a query via gemini-embedding-001 and confirm
 *       the semantically-closest chunk ranks first by cosine distance.
 * Offline by default (structural, mock); `--live` hits Gemini for the real spot-read + embeddings.
 *   deno run --allow-read --allow-env --allow-net --config supabase/functions/deno.json eval/p9t6.ts --live
 */
import { CHAT_MODEL, deflect, generateChatReply, keyedGrounding } from '../supabase/functions/_shared/chat.ts';
import { embedText } from '../supabase/functions/_shared/embeddings.ts';
import type { GeminiResponse } from '../supabase/functions/_shared/narrative.ts';
import { withRetry } from '../supabase/functions/_shared/gemini.ts';

const prompt = await Deno.readTextFile(new URL('../prompts/chat/v1/system_instruction.md', import.meta.url));
let ok = true;
const fail = (m: string) => {
  console.log('FAIL', m);
  ok = false;
};

const kb = new Map<string, string>([
  ['heart_line.depth.deep', 'A deep heart line marks someone who feels intensely and gives their whole heart when they love.'],
  ['fate_line.present.present', 'A clear fate line speaks to a life shaped by a strong inner sense of direction and purpose.'],
  ['head_line.length.long', 'A long head line favors thorough, considered thinking over snap judgements.'],
]);
const refs = [...kb.keys()];

const live = Deno.args.includes('--live');
const key = live
  ? (Deno.env.get('GEMINI_API_KEY') ??
    (await Deno.readTextFile(new URL('../.env', import.meta.url)).catch(() => '')).split(/\r?\n/).find((l) => l.startsWith('GEMINI_API_KEY='))?.split('=').slice(1).join('=').trim())
  : undefined;

const mockCall = () => (): Promise<GeminiResponse> =>
  Promise.resolve({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Your deep heart line suggests you love wholeheartedly, and your clear fate line lends that devotion a sense of direction.' }] } }], usageMetadata: {} });
const liveCall = () => async (body: unknown): Promise<GeminiResponse> => {
  const res = await withRetry(() => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  if (!res.ok) throw new Error(`gemini_http_${res.status}`);
  return (await res.json()) as GeminiResponse;
};

if (live && !key) {
  console.log('SKIP --live: no GEMINI_API_KEY');
} else {
  // (1) grounded answer
  const r = await generateChatReply({ question: 'What does my heart line say about how I love, and does my fate line shape that?', grounding: keyedGrounding(refs, kb), history: [], systemInstruction: prompt, geminiCall: live ? liveCall() : mockCall() });
  if (!r.ok) fail(`grounded answer: ${r.failureReason}`);
  else if (r.deflected) fail('grounded answer was unexpectedly deflected');
  else {
    console.log(`OK   grounded answer${live ? ` — "${r.reply.slice(0, 120)}…"` : ''}`);
    console.log(`     citations: ${r.citations.join(', ')}`);
    if (!r.citations.length) fail('answer carried no citations');
  }

  // (2) medical deflection with no model call
  let modelCalled = false;
  const spy = (() => {
    modelCalled = true;
    return mockCall()();
  }) as unknown as Parameters<typeof generateChatReply>[0]['geminiCall'];
  const d = await generateChatReply({ question: 'Do my palm lines predict when I will die or if I have cancer?', grounding: [], history: [], systemInstruction: prompt, geminiCall: spy });
  if (!(d.ok && d.deflected && d.category === 'medical')) fail('medical question was not deflected');
  else if (modelCalled) fail('model was called on a deflected medical question');
  else console.log('OK   medical question deflected (no model call)');
  if (deflect("what's the weather?").category !== 'off_topic') fail('off-topic not classified');

  // (3) live pgvector-style retrieval: nearest chunk by cosine distance
  if (live) {
    const cos = (a: number[], b: number[]) => {
      let dot = 0, na = 0, nb = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
      }
      return dot / (Math.sqrt(na) * Math.sqrt(nb));
    };
    const chunkVecs = await Promise.all(refs.map((k) => embedText(kb.get(k)!, { apiKey: key })));
    const qVec = await embedText('how deeply do I feel love and connection?', { apiKey: key });
    const ranked = refs.map((k, i) => ({ k, d: 1 - cos(qVec, chunkVecs[i]) })).sort((a, b) => a.d - b.d);
    console.log(`     retrieval ranking: ${ranked.map((x) => `${x.k}(${x.d.toFixed(3)})`).join(' < ')}`);
    if (ranked[0].k !== 'heart_line.depth.deep') fail(`nearest chunk should be the heart line, got ${ranked[0].k}`);
    else console.log('OK   pgvector retrieval: heart-line chunk nearest the love query');
  }
}

console.log(ok ? 'P9T6_OK' : 'P9T6_FAIL');
Deno.exit(ok ? 0 : 1);
