// Pass-2 narrative generation (Backend §6.3, §6.6.6). The trust design: the CLAIMS a reading makes
// — which sections appear, in what order, and the `tags`/`feature_refs` (feature_keys) grounding
// each — are DETERMINISTIC, computed here in code from the stored features via keyed KB lookup
// (§6.5). Only the prose (`headline`/`title`/`body`) comes from the model, and it is grafted onto
// the deterministic skeleton. So regenerating from identical features yields identical claims
// (wording may vary) — the P5.T6 consistency guarantee, provable without a live model call.
import AjvDefault from 'ajv';
import readingSchema from '../../../schemas/reading_sections.v1.json' with { type: 'json' };

export const NARRATIVE_MODEL = 'gemini-3.1-flash-lite';
export const PROMPT_VERSION = 'narrative.v1';
export const KB_VERSION = 'v1';
export const NARRATIVE_PINNED_SEED = 11;

export type FeatureKind = 'palm' | 'face';
export const traditionFor = (kind: FeatureKind): 'palmistry' | 'physiognomy' =>
  kind === 'palm' ? 'palmistry' : 'physiognomy';

export interface Claim {
  feature_key: string;
  reference: string; // the KB passage that is this claim's authoritative meaning
}
export interface SelectedSection {
  key: string;
  title: string;
  depth_level: number;
  tags: string[]; // = the section's feature_keys — the deterministic claim identifiers
  claims: Claim[];
}
export interface NarrativeSection {
  key: string;
  title: string;
  body: string;
  depth_level: number;
  tags: string[];
  feature_refs: string[];
}
export interface Narrative {
  headline: string;
  summary?: string;
  sections: NarrativeSection[];
  disclaimer?: string;
}

type Rec = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const uniq = <T>(xs: T[]): T[] => [...new Set(xs)];

interface SectionSkeleton {
  key: string;
  title: string;
  depth_level: number;
  featureKeys: string[];
}

/** Deterministic (feature → feature_keys) mapping. Mirrors kb/audit.mjs KEY_MAP; keys must exist in KB. */
function palmSkeletons(f: Rec): SectionSkeleton[] {
  const out: SectionSkeleton[] = [];
  const hs = str(f.hand_shape);
  if (hs) out.push({ key: 'hand_shape', title: 'Your Hand', depth_level: 1, featureKeys: [`hand_shape.${hs}`] });

  for (const [line, key, title] of [
    ['heart_line', 'heart', 'Your Heart Line'],
    ['head_line', 'head', 'Your Head Line'],
    ['life_line', 'life', 'Your Life Line'],
  ] as const) {
    const L = f[line] as Rec | undefined;
    if (!L) continue;
    const keys: string[] = [];
    for (const dim of ['length', 'depth', 'curvature', 'ending'] as const) {
      const v = str(L[dim]);
      if (v) keys.push(`${line}.${dim}.${v}`);
    }
    for (const dim of ['breaks', 'islands', 'chains'] as const) {
      const v = str(L[dim]);
      if (v && v !== 'none') keys.push(`${line}.${dim}.${v}`); // surface only notable morphology
    }
    if (keys.length) out.push({ key, title, depth_level: 1, featureKeys: keys });
  }

  const fate = f.fate_line as Rec | undefined;
  if (fate) {
    const present = str(fate.present);
    const keys: string[] = [];
    if (present) keys.push(`fate_line.present.${present}`);
    const origin = str(fate.origin);
    if (present && present !== 'absent' && origin) keys.push(`fate_line.origin.${origin}`);
    if (keys.length) out.push({ key: 'fate', title: 'Your Fate Line', depth_level: 2, featureKeys: keys });
  }

  const mounts = Array.isArray(f.mounts) ? (f.mounts as Rec[]).filter((m) => str(m?.prominence) && m.prominence !== 'flat') : [];
  if (mounts.length) {
    const sorted = [...mounts].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const keys: string[] = [];
    for (const m of sorted) {
      const name = str(m.name);
      const prom = str(m.prominence);
      if (name) keys.push(`mount.name.${name}`);
      if (prom) keys.push(`mount.prominence.${prom}`);
    }
    out.push({ key: 'mounts', title: 'Your Mounts', depth_level: 2, featureKeys: uniq(keys) });
  }

  const marks = Array.isArray(f.notable_markings) ? (f.notable_markings as Rec[]) : [];
  const types = uniq(marks.map((m) => str(m.type)).filter((t): t is string => !!t)).sort();
  if (types.length) out.push({ key: 'markings', title: 'Notable Markings', depth_level: 2, featureKeys: types.map((t) => `marking.${t}`) });

  return out;
}

function faceSkeletons(f: Rec): SectionSkeleton[] {
  const out: SectionSkeleton[] = [];
  const fsh = str(f.face_shape);
  if (fsh) out.push({ key: 'face_shape', title: 'Your Elemental Face', depth_level: 1, featureKeys: [`face_shape.${fsh}`] });

  const prop: string[] = [];
  const tc = str(f.three_courts);
  const fe = str(f.five_eyes_spacing);
  if (tc) prop.push(`three_courts.${tc}`);
  if (fe) prop.push(`five_eyes_spacing.${fe}`);
  if (prop.length) out.push({ key: 'proportion', title: 'Balance & Proportion', depth_level: 1, featureKeys: prop });

  const eyes = f.eyes as Rec | undefined;
  if (eyes && str(eyes.shape) && str(eyes.set)) out.push({ key: 'eyes', title: 'Your Eyes', depth_level: 1, featureKeys: [`eyes.shape.${eyes.shape}`, `eyes.set.${eyes.set}`] });

  const brows = f.eyebrows as Rec | undefined;
  if (brows && str(brows.shape)) out.push({ key: 'eyebrows', title: 'Your Brows', depth_level: 2, featureKeys: [`eyebrows.shape.${brows.shape}`] });

  const nose = f.nose as Rec | undefined;
  if (nose && str(nose.shape) && str(nose.bridge)) out.push({ key: 'nose', title: 'Your Nose', depth_level: 2, featureKeys: [`nose.shape.${nose.shape}`, `nose.bridge.${nose.bridge}`] });

  const mouth = f.mouth as Rec | undefined;
  if (mouth && str(mouth.shape)) out.push({ key: 'mouth', title: 'Your Mouth', depth_level: 2, featureKeys: [`mouth.shape.${mouth.shape}`] });

  const ears = f.ears as Rec | undefined;
  if (ears && str(ears.set) && str(ears.size)) out.push({ key: 'ears', title: 'Your Ears', depth_level: 2, featureKeys: [`ears.set.${ears.set}`, `ears.size.${ears.size}`] });

  const cw = str(f.canthus_wolong);
  if (cw) out.push({ key: 'canthus', title: 'Under-eye (卧蚕)', depth_level: 2, featureKeys: [`canthus_wolong.${cw}`] });

  return out;
}

/**
 * DETERMINISTIC: features → ordered sections with their claims + KB grounding. `kb` maps
 * feature_key → passage (the tradition's kb_chunks). `tags` are pure functions of `features`, so
 * two calls with identical features produce identical tags regardless of `kb`. Claims whose key is
 * missing from `kb` are dropped (should not happen — coverage is 141/141) and reported via
 * `missingKeys`.
 */
export function selectClaims(
  kind: FeatureKind,
  features: Rec,
  kb: Map<string, string>,
): { sections: SelectedSection[]; missingKeys: string[] } {
  const skeletons = kind === 'palm' ? palmSkeletons(features) : faceSkeletons(features);
  const missingKeys: string[] = [];
  const sections: SelectedSection[] = [];
  for (const sk of skeletons) {
    const claims: Claim[] = [];
    for (const fk of sk.featureKeys) {
      const reference = kb.get(fk);
      if (!reference) {
        missingKeys.push(fk);
        continue;
      }
      claims.push({ feature_key: fk, reference });
    }
    if (claims.length) sections.push({ key: sk.key, title: sk.title, depth_level: sk.depth_level, tags: sk.featureKeys, claims });
  }
  return { sections, missingKeys };
}

export const filterDepth = (sections: SelectedSection[], maxDepth: number): SelectedSection[] =>
  sections.filter((s) => s.depth_level <= maxDepth);

// ── Gemini request (features + KB only — NO image; §6.3) ────────────────────────────────────
export interface GeminiResponse {
  candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; cachedContentTokenCount?: number };
}
export type GeminiCall = (body: unknown) => Promise<GeminiResponse>;

const LLM_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    summary: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: { key: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } },
        required: ['key', 'title', 'body'],
      },
    },
    disclaimer: { type: 'string' },
  },
  required: ['headline', 'sections'],
};

export function buildRequest(kind: FeatureKind, depthLevel: number, sections: SelectedSection[], systemInstruction: string): Record<string, unknown> {
  const payload = {
    kind,
    depth_level: depthLevel,
    sections: sections.map((s) => ({ key: s.key, title: s.title, claims: s.claims })),
  };
  return {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: `Write the reading for these grounded observations:\n${JSON.stringify(payload)}` }] }],
    generationConfig: {
      temperature: 0,
      seed: NARRATIVE_PINNED_SEED,
      responseMimeType: 'application/json',
      responseSchema: LLM_RESPONSE_SCHEMA,
    },
  };
}

// ── Banned-claims guard (mirrors kb/audit.mjs BANNED; Backend §13). Rejects any model prose that
// smuggles in a medical/lifespan/pregnancy/financial claim. ─────────────────────────────────────
const BANNED: RegExp[] = [
  /\bdiseases?\b/i, /\billness(es)?\b/i, /\bdiagnos(e|es|is|ing|tic)\b/i, /\bsymptoms?\b/i,
  /\bcancers?\b/i, /\btumou?rs?\b/i, /\bmedical\b/i, /\bmedicine\b/i, /\bcures?\b/i,
  /\bprescri(be|ption)/i, /\bdiabet(es|ic)\b/i, /\bblood pressure\b/i, /\bimmune\b/i,
  /\bailments?\b/i, /\byour health\b/i, /\bhealth (problem|issue|condition|warning)/i,
  /\blifespan\b/i, /\blife span\b/i, /\blongevity\b/i, /\bwhen you(’|'|)?ll die\b/i,
  /\byou will die\b/i, /\bmortality\b/i, /\bpredicts? (your )?death\b/i, /\byears? (left )?to live\b/i,
  /\bpregnan(t|cy|cies)\b/i, /\bconceive\b/i, /\bmiscarr(y|iage)/i, /\bfertility\b/i, /\bnumber of children\b/i,
  /\bfinancial advice\b/i, /\binvest in\b/i, /\bbuy stocks?\b/i, /\bguaranteed (wealth|riches|money|profit|income)\b/i,
];
export const bannedHits = (text: string): string[] => BANNED.filter((re) => re.test(text)).map((re) => re.source);

// ── Validation of the final (grafted) narrative ─────────────────────────────────────────────
type ValidateFn = ((data: unknown) => boolean) & { errors?: unknown };
type AjvInstance = { compile(schema: unknown): ValidateFn; errorsText(errors?: unknown): string };
const Ajv = AjvDefault as unknown as new (opts?: Record<string, unknown>) => AjvInstance;
const ajv = new Ajv({ allErrors: true, strict: false });
const validateReading = ajv.compile(readingSchema);

export type NarrativeResult =
  | { ok: true; narrative: Narrative; usage?: GeminiResponse['usageMetadata'] }
  | { ok: false; failureReason: string; detail?: string };

/** Graft model prose onto the deterministic skeleton: keys/tags/feature_refs/depth_level come from
 *  `selected` (never the model); title/body come from the model, with a KB-composed fallback. */
function graft(selected: SelectedSection[], llmSections: Array<Rec>): NarrativeSection[] {
  const byKey = new Map<string, Rec>();
  for (const s of llmSections) if (str(s.key)) byKey.set(str(s.key)!, s);
  return selected.map((s) => {
    const m = byKey.get(s.key);
    const body = str(m?.body)?.trim();
    return {
      key: s.key,
      title: str(m?.title)?.trim() || s.title,
      body: body && body.length > 0 ? body : s.claims.map((c) => c.reference).join(' '),
      depth_level: s.depth_level,
      tags: s.tags,
      feature_refs: s.claims.map((c) => c.feature_key),
    };
  });
}

export async function generateNarrative(input: {
  kind: FeatureKind;
  features: Rec;
  kb: Map<string, string>;
  depthLevel: number;
  systemInstruction: string;
  geminiCall: GeminiCall;
}): Promise<NarrativeResult> {
  const { sections, missingKeys } = selectClaims(input.kind, input.features, input.kb);
  const selected = filterDepth(sections, input.depthLevel);
  if (selected.length === 0) return { ok: false, failureReason: 'no_sections', detail: missingKeys.join(',') };

  const res = await input.geminiCall(buildRequest(input.kind, input.depthLevel, selected, input.systemInstruction));
  const cand = res.candidates?.[0];
  const finish = cand?.finishReason;
  if (finish && finish !== 'STOP') return { ok: false, failureReason: `gemini_finish_${finish.toLowerCase()}` };

  const text = cand?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  let raw: Rec;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, failureReason: 'invalid_json', detail: text.slice(0, 120) };
  }

  const narrative: Narrative = {
    headline: str(raw.headline)?.trim() || defaultHeadline(input.kind),
    summary: str(raw.summary)?.trim(),
    sections: graft(selected, Array.isArray(raw.sections) ? (raw.sections as Rec[]) : []),
    disclaimer: str(raw.disclaimer)?.trim() || 'For reflection and entertainment.',
  };

  if (!validateReading(narrative)) return { ok: false, failureReason: 'schema_invalid', detail: ajv.errorsText(validateReading.errors) };

  // content-safety: no medical/lifespan/etc. claim may survive into stored prose
  const scan = [narrative.headline, narrative.summary ?? '', ...narrative.sections.flatMap((s) => [s.title, s.body])].join('\n');
  const hits = bannedHits(scan);
  if (hits.length) return { ok: false, failureReason: 'content_safety', detail: hits.join(',') };

  return { ok: true, narrative, usage: res.usageMetadata };
}

function defaultHeadline(kind: FeatureKind): string {
  return kind === 'palm' ? 'What your palm has to say' : 'What your face has to say';
}
