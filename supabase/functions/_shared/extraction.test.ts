import { assert, assertEquals } from '@std/assert';
import { toGeminiSchema, validateFeatures } from './schema.ts';
import { extractFeatures, type GeminiResponse } from './extraction.ts';
import palmSchema from '../../../schemas/palm_features.v1.json' with { type: 'json' };

const validPalm = {
  is_hand: true,
  hand_shape: 'water',
  heart_line: { length: 'long', depth: 'deep', curvature: 'gently_curved', ending: 'between_index_middle', breaks: 'none', islands: 'none', chains: 'none', confidence: 'high' },
  head_line: { length: 'medium', depth: 'moderate', curvature: 'gently_curved', ending: 'other', breaks: 'none', islands: 'none', chains: 'none', confidence: 'medium' },
  life_line: { length: 'long', depth: 'moderate', curvature: 'strongly_curved', ending: 'other', breaks: 'none', islands: 'none', chains: 'none', confidence: 'high' },
  fate_line: { present: 'clear', origin: 'wrist', confidence: 'medium' },
  mounts: [{ name: 'venus', prominence: 'prominent' }],
  line_geometry: { heart_line: [[100, 300], [700, 330]], head_line: [[110, 470], [430, 480]], life_line: [[250, 380], [300, 760]] },
  overall_confidence: 'high',
};

const mock = (text: string, finishReason = 'STOP') => (): Promise<GeminiResponse> =>
  Promise.resolve({
    candidates: [{ finishReason, content: { parts: [{ text }] } }],
    usageMetadata: { promptTokenCount: 2000, candidatesTokenCount: 500, cachedContentTokenCount: 1800 },
  });

const input = (geminiCall: () => Promise<GeminiResponse>) => ({
  imageBase64: 'AAAA',
  kind: 'palm' as const,
  systemInstruction: 'test prefix',
  geminiCall,
});

Deno.test('toGeminiSchema inlines $ref and strips JSON-Schema-only keywords', () => {
  const g = toGeminiSchema(palmSchema as Record<string, unknown>) as any;
  assert(!('$schema' in g) && !('$defs' in g) && !('additionalProperties' in g), 'stripped');
  // heart_line was a $ref to $defs/major_line → now inlined with its enum props
  assertEquals(g.properties.heart_line.properties.length.enum, ['short', 'medium', 'long']);
  assert(!JSON.stringify(g).includes('$ref'), 'no dangling $ref');
});

Deno.test('validateFeatures accepts valid, rejects bad enum', () => {
  assert(validateFeatures('palm', validPalm).valid);
  assert(!validateFeatures('palm', { ...validPalm, hand_shape: 'square' }).valid);
});

Deno.test('extractFeatures: valid response → features + hash + geometry', async () => {
  const r = await extractFeatures(input(mock(JSON.stringify(validPalm))));
  assert(r.ok);
  if (r.ok) {
    assert(/^[0-9a-f]{64}$/.test(r.featureHash));
    assert(r.geometry.heart && r.geometry.life);
    assertEquals(r.usage?.cachedContentTokenCount, 1800);
  }
});

Deno.test('extractFeatures: non-hand → not_a_hand', async () => {
  const r = await extractFeatures(input(mock(JSON.stringify({ ...validPalm, is_hand: false }))));
  assert(!r.ok && r.failureReason === 'not_a_hand');
});

Deno.test('extractFeatures: MAX_TOKENS finish → gemini_finish_max_tokens', async () => {
  const r = await extractFeatures(input(mock('', 'MAX_TOKENS')));
  assert(!r.ok && r.failureReason === 'gemini_finish_max_tokens');
});

Deno.test('extractFeatures: non-JSON text → invalid_json', async () => {
  const r = await extractFeatures(input(mock('not json at all')));
  assert(!r.ok && r.failureReason === 'invalid_json');
});

Deno.test('extractFeatures: schema-invalid output → schema_invalid', async () => {
  const r = await extractFeatures(input(mock(JSON.stringify({ ...validPalm, hand_shape: 'square' }))));
  assert(!r.ok && r.failureReason === 'schema_invalid');
});
