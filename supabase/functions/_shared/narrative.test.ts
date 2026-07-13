import { assert, assertEquals } from '@std/assert';
import {
  bannedHits,
  filterDepth,
  generateNarrative,
  selectClaims,
  type GeminiResponse,
} from './narrative.ts';
import palmKb from '../../../kb/v1/palmistry.json' with { type: 'json' };
import faceKb from '../../../kb/v1/physiognomy.json' with { type: 'json' };
import palm01 from '../../../eval/samples/narrative/palm_01.json' with { type: 'json' };
import palm03 from '../../../eval/samples/narrative/palm_03.json' with { type: 'json' };
import face01 from '../../../eval/samples/narrative/face_01.json' with { type: 'json' };

const kbMap = (doc: { chunks: Array<{ feature_key: string; content: string }> }) =>
  new Map(doc.chunks.map((c) => [c.feature_key, c.content]));
const PALM_KB = kbMap(palmKb);
const FACE_KB = kbMap(faceKb);

const mock = (obj: unknown, finishReason = 'STOP') => (): Promise<GeminiResponse> =>
  Promise.resolve({
    candidates: [{ finishReason, content: { parts: [{ text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] } }],
    usageMetadata: { promptTokenCount: 3000, candidatesTokenCount: 900, cachedContentTokenCount: 0 },
  });

const gen = (features: Record<string, unknown>, kb: Map<string, string>, kind: 'palm' | 'face', geminiCall: () => Promise<GeminiResponse>, depthLevel = 2) =>
  generateNarrative({ kind, features, kb, depthLevel, systemInstruction: 'test', geminiCall });

// A mock that echoes the requested section keys back with generic bodies (well-behaved model).
const echoCall = (features: Record<string, unknown>, kb: Map<string, string>, kind: 'palm' | 'face', depth = 2) => {
  const { sections } = selectClaims(kind, features, kb);
  const chosen = filterDepth(sections, depth);
  return mock({
    headline: 'A vivid headline',
    summary: 'A warm overview.',
    sections: chosen.map((s) => ({ key: s.key, title: s.title, body: `Prose for ${s.key}.` })),
    disclaimer: 'For reflection and entertainment.',
  });
};

Deno.test('selectClaims is deterministic: identical features → identical tags', () => {
  const a = selectClaims('palm', palm01 as Record<string, unknown>, PALM_KB);
  const b = selectClaims('palm', structuredClone(palm01) as Record<string, unknown>, PALM_KB);
  assertEquals(a.sections.map((s) => s.tags), b.sections.map((s) => s.tags));
  assertEquals(a.missingKeys, []);
  assert(a.sections.length > 0);
});

Deno.test('selectClaims: palm sections, depth levels, and mount filtering', () => {
  const { sections, missingKeys } = selectClaims('palm', palm03 as Record<string, unknown>, PALM_KB);
  assertEquals(missingKeys, []);
  const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));
  // depth-1 majors present
  for (const k of ['hand_shape', 'heart', 'head', 'life']) assert(byKey[k]?.depth_level === 1, `${k} depth 1`);
  // depth-2 sections
  for (const k of ['fate', 'mounts', 'markings']) assert(byKey[k]?.depth_level === 2, `${k} depth 2`);
  // saturn is flat → excluded; apollo (prominent) + mars_upper (moderate) surface
  assert(byKey.mounts.tags.includes('mount.name.apollo') && byKey.mounts.tags.includes('mount.name.mars_upper'));
  assert(!byKey.mounts.tags.includes('mount.name.saturn'), 'flat mount excluded');
  // chained heart line is notable → surfaced; a "none" morphology is not
  assert(byKey.heart.tags.includes('heart_line.chains.chained'));
  assert(!byKey.heart.tags.some((t) => t.endsWith('.breaks.none')), 'none-morphology not surfaced');
  // markings deduped/sorted by type
  assertEquals(byKey.markings.tags, ['marking.cross', 'marking.grille']);
});

Deno.test('filterDepth: depth 1 keeps only free sections', () => {
  const { sections } = selectClaims('palm', palm01 as Record<string, unknown>, PALM_KB);
  const free = filterDepth(sections, 1);
  assert(free.every((s) => s.depth_level === 1));
  assert(free.length < sections.length, 'some depth-2 sections were dropped');
});

Deno.test('generateNarrative: well-behaved model → schema-valid, grafted tags are deterministic', async () => {
  const r = await gen(palm01 as Record<string, unknown>, PALM_KB, 'palm', echoCall(palm01 as Record<string, unknown>, PALM_KB, 'palm'));
  assert(r.ok);
  if (r.ok) {
    const sel = filterDepth(selectClaims('palm', palm01 as Record<string, unknown>, PALM_KB).sections, 2);
    assertEquals(r.narrative.sections.map((s) => s.key), sel.map((s) => s.key));
    // tags/feature_refs come from the deterministic skeleton, never the model
    assertEquals(r.narrative.sections.map((s) => s.tags), sel.map((s) => s.tags));
    assert(r.narrative.sections.every((s) => s.feature_refs.length > 0));
    assertEquals(r.narrative.disclaimer, 'For reflection and entertainment.');
  }
});

Deno.test('generateNarrative: model omits bodies → KB-composed fallback keeps output schema-valid', async () => {
  const r = await gen(face01 as Record<string, unknown>, FACE_KB, 'face', mock({ headline: 'H', sections: [] }));
  assert(r.ok);
  if (r.ok) assert(r.narrative.sections.every((s) => s.body.length >= 20), 'fallback bodies from KB references');
});

Deno.test('generateNarrative: identical features → identical claims across different wordings', async () => {
  const r1 = await gen(palm03 as Record<string, unknown>, PALM_KB, 'palm', mock({ headline: 'One way', sections: [] }));
  const r2 = await gen(palm03 as Record<string, unknown>, PALM_KB, 'palm', mock({ headline: 'A totally different way', sections: [{ key: 'heart', title: 'x', body: 'y' }] }));
  assert(r1.ok && r2.ok);
  if (r1.ok && r2.ok) {
    const claims = (n: typeof r1.narrative) => n.sections.map((s) => ({ key: s.key, tags: s.tags, refs: s.feature_refs }));
    assertEquals(claims(r1.narrative), claims(r2.narrative), 'claims identical though prose differs');
  }
});

Deno.test('generateNarrative: MAX_TOKENS / invalid JSON / content-safety failures', async () => {
  const maxTok = await gen(palm01 as Record<string, unknown>, PALM_KB, 'palm', mock('', 'MAX_TOKENS'));
  assert(!maxTok.ok && maxTok.failureReason === 'gemini_finish_max_tokens');

  const badJson = await gen(palm01 as Record<string, unknown>, PALM_KB, 'palm', mock('not json'));
  assert(!badJson.ok && badJson.failureReason === 'invalid_json');

  const unsafe = await gen(palm01 as Record<string, unknown>, PALM_KB, 'palm',
    mock({ headline: 'This will diagnose your illness', sections: [] }));
  assert(!unsafe.ok && unsafe.failureReason === 'content_safety');
});

Deno.test('bannedHits flags claim phrasing but not palmistry vocabulary', () => {
  assertEquals(bannedHits('Your life line is deep and your heart line is warm.'), []);
  assert(bannedHits('this predicts your death and your lifespan').length >= 2);
});
