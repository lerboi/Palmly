// Repeat-scan consistency (Backend §6.6.3-5) — the P1 trust requirement.
//   • subject matching: a new scan's scale-invariant geometry vs the user's subject_profiles;
//     a close match ⇒ "same hand" ⇒ reuse the canonical feature_set (zero drift, near-zero cost).
//   • for a genuinely new subject: 2-vote extraction with field-level majority (+ a tie-break 3rd
//     run on disagreement); disagreeing enum fields are marked confidence:low so the narrative hedges.
import { canonicalize } from './features.ts';
import { geometryDistance, handDistance, type Geometry, type HandSignature } from './features.ts';
import type { ExtractResult } from './extraction.ts';

// Normalized geometry distance below which two scans are the same hand. Spec-silent; chosen
// conservatively (Decision Log 2026-07-12) — tune against the P12 eval set.
// ⚠️ Live finding 2026-07-25: a REAL same-palm rescan (canonical crops, temp 0) measured 0.156 —
// Gemini's line drawings are too unstable to identify a hand. This matcher is now the FALLBACK
// (legacy scans without a hand signature); kept strict because its failure mode when loose is
// serving someone the wrong person's reading.
export const MATCH_THRESHOLD = 0.08;

// Mean |Δ| across the 5 hand-signature components (canonical palm-height units) below which two
// scans are the same hand. Same-hand repeat jitter is expected ≲0.01 (MediaPipe on canonical
// crops); different hands differ in length/width mix by ≳0.03. Provisional — tune against the
// P12 eval set (Decision Log 2026-07-25).
export const HAND_MATCH_THRESHOLD = 0.025;

/** Closest subject by HAND-SHAPE signature within threshold, or null. The primary matcher —
 *  runs BEFORE extraction (the §6.6 item 4 zero-extraction fast path). */
export function matchSubjectByHand<T extends SubjectCandidate>(
  sig: HandSignature | null,
  candidates: T[],
  threshold = HAND_MATCH_THRESHOLD,
): { subject: T; distance: number } | null {
  if (!sig) return null;
  let best: { subject: T; distance: number } | null = null;
  for (const c of candidates) {
    const stored = c.geometry?.hand;
    if (!stored) continue;
    const d = handDistance(sig, stored);
    if (d <= threshold && (best === null || d < best.distance)) best = { subject: c, distance: d };
  }
  return best;
}

export interface SubjectCandidate {
  subjectId: string;
  canonicalFeatureSetId: string;
  geometry: Geometry;
}

/** Closest subject within threshold, or null (⇒ new subject). */
export function matchSubject<T extends SubjectCandidate>(
  g: Geometry,
  candidates: T[],
  threshold = MATCH_THRESHOLD,
): { subject: T; distance: number } | null {
  let best: { subject: T; distance: number } | null = null;
  for (const c of candidates) {
    const d = geometryDistance(g, c.geometry);
    if (d <= threshold && (best === null || d < best.distance)) best = { subject: c, distance: d };
  }
  return best;
}

const pickMode = (vals: unknown[]): unknown => {
  const counts = new Map<unknown, number>();
  for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]; // most frequent; first on tie
};

type Obj = Record<string, unknown>;

/** Merge N extractions by field-level majority; on a leaf disagreement, lower the enclosing
 *  object's `confidence` to 'low'. Arrays + line_geometry take the first vote (order-stable). */
export function fieldMajority(votes: Obj[]): Obj {
  if (votes.length === 1) return votes[0];
  const mergeObjects = (objs: Obj[]): Obj => {
    const keys = [...new Set(objs.flatMap((o) => Object.keys(o)))];
    const out: Obj = {};
    let disagreed = false;
    for (const k of keys) {
      const vals = objs.map((o) => o[k]);
      if (Array.isArray(vals[0]) || k === 'line_geometry') {
        out[k] = vals[0];
      } else if (vals[0] && typeof vals[0] === 'object') {
        out[k] = mergeObjects(vals as Obj[]);
      } else {
        if (k !== 'confidence' && !vals.every((v) => v === vals[0])) disagreed = true;
        out[k] = pickMode(vals);
      }
    }
    if (disagreed && 'confidence' in out) out.confidence = 'low';
    return out;
  };
  return mergeObjects(votes);
}

const semantic = (f: Obj): string => {
  const { line_geometry: _g, ...rest } = f;
  return canonicalize(rest);
};

/** Do two extractions agree on every semantic bucket (geometry ignored)? */
export const sameFeatures = (a: Obj, b: Obj): boolean => semantic(a) === semantic(b);

export interface VoteResult {
  features: Obj;
  votes: number;
  agreed: boolean;
}

/**
 * Run an extraction twice; if the two agree on all semantic buckets, use them; otherwise run a
 * third tie-break and take the field-level majority. `runExtract` is injectable for testing.
 * Returns null-carrying ExtractResult on any extraction failure (fail fast).
 */
export async function twoVoteExtract(
  runExtract: () => Promise<ExtractResult>,
): Promise<{ ok: true; result: VoteResult } | { ok: false; failureReason: string }> {
  const a = await runExtract();
  if (!a.ok) return { ok: false, failureReason: a.failureReason };
  const b = await runExtract();
  if (!b.ok) return { ok: false, failureReason: b.failureReason };

  if (semantic(a.features) === semantic(b.features)) {
    return { ok: true, result: { features: a.features, votes: 2, agreed: true } };
  }
  const c = await runExtract();
  const votes = c.ok ? [a.features, b.features, c.features] : [a.features, b.features];
  return { ok: true, result: { features: fieldMajority(votes), votes: votes.length, agreed: false } };
}
