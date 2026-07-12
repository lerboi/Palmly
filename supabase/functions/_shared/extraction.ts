// Pass-1 feature extraction (Backend §6.2, §6.6): image → constrained-decoding Gemini call →
// finishReason check → JSON parse → server-side schema validation → feature_hash + geometry.
// `geminiCall` is injectable so the whole pipeline is unit-testable without the network.
import { faceSchema, palmSchema, toGeminiSchema, validateFeatures, type FeatureKind } from './schema.ts';
import { deriveGeometry, featureHash, type Geometry } from './features.ts';

export const EXTRACTION_MODEL = 'gemini-3.5-flash';
export const PINNED_SEED = 7;

export interface GeminiResponse {
  candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; cachedContentTokenCount?: number };
}
export type GeminiCall = (body: unknown) => Promise<GeminiResponse>;

export interface ExtractInput {
  imageBase64: string;
  mimeType?: string;
  kind: FeatureKind;
  systemInstruction: string; // the frozen cached prefix (prompts/extraction/v1)
  geminiCall: GeminiCall;
}
export type ExtractResult =
  | { ok: true; features: Record<string, unknown>; featureHash: string; geometry: Geometry; usage?: GeminiResponse['usageMetadata'] }
  | { ok: false; failureReason: string; detail?: string };

/** Build the extraction request: image part before the instruction; temp 0 + pinned seed; schema. */
export function buildRequest(input: ExtractInput): Record<string, unknown> {
  const schema = input.kind === 'palm' ? palmSchema : faceSchema;
  return {
    systemInstruction: { parts: [{ text: input.systemInstruction }] },
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: input.mimeType ?? 'image/jpeg', data: input.imageBase64 } },
          { text: `Extract the ${input.kind} features as JSON per the schema.` },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      seed: PINNED_SEED,
      responseMimeType: 'application/json',
      responseSchema: toGeminiSchema(schema as Record<string, unknown>),
    },
  };
}

export async function extractFeatures(input: ExtractInput): Promise<ExtractResult> {
  const res = await input.geminiCall(buildRequest(input));
  const cand = res.candidates?.[0];

  const finish = cand?.finishReason;
  if (finish && finish !== 'STOP') return { ok: false, failureReason: `gemini_finish_${finish.toLowerCase()}` };

  const text = cand?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  let features: Record<string, unknown>;
  try {
    features = JSON.parse(text);
  } catch {
    return { ok: false, failureReason: 'invalid_json', detail: text.slice(0, 120) };
  }

  const v = validateFeatures(input.kind, features);
  if (!v.valid) return { ok: false, failureReason: 'schema_invalid', detail: v.errors };
  if (input.kind === 'palm' && features.is_hand === false) return { ok: false, failureReason: 'not_a_hand' };
  if (input.kind === 'face' && features.is_face === false) return { ok: false, failureReason: 'not_a_face' };

  return { ok: true, features, featureHash: await featureHash(features), geometry: deriveGeometry(features), usage: res.usageMetadata };
}
