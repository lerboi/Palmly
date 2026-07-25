// Deterministic feature hashing + geometry derivation (Backend §3.2, §6.6). feature_hash is the
// consistency key: the same enum buckets → the same hash (line_geometry excluded, since exact
// pixel paths vary while the semantic reading does not). geometry is the scale-invariant signature
// used to recognise "the same hand" across scans (subject_profiles matching, P5.T3).

/** Stable JSON: object keys sorted recursively so identical content → identical bytes. */
export function canonicalize(value: unknown): string {
  const seen = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(seen);
    if (v && typeof v === 'object') {
      return Object.keys(v as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = seen((v as Record<string, unknown>)[k]);
          return acc;
        }, {});
    }
    return v;
  };
  return JSON.stringify(seen(value));
}

/** sha256 hex of the canonicalized semantic features (line_geometry stripped). */
export async function featureHash(features: Record<string, unknown>): Promise<string> {
  const { line_geometry: _drop, ...semantic } = features;
  const bytes = new TextEncoder().encode(canonicalize(semantic));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

type Point = [number, number];
export interface LineGeometry {
  length: number; // polyline length / 1000 (scale-invariant)
  start: Point;
  end: Point;
  centroid: Point;
}

/**
 * The client's scale-invariant hand-SHAPE signature (Backend §6.6 item 3): index/middle/ring/
 * pinky chain lengths + palm width, measured on the 21 MediaPipe landmarks in the cv1 canonical
 * frame (already palm-height-normalized by the warp). Arrives via `capture_meta.hand_geometry`
 * and is stored inside `feature_sets.geometry.hand`. This is the PRIMARY identity matcher —
 * added 2026-07-25 after the line-geometry matcher failed its first live repeat-scan (Gemini
 * re-draws lines with ±0.02–0.07 variance; MediaPipe landmarks on a canonical crop are stable).
 */
export interface HandSignature {
  fingers: number[]; // [index, middle, ring, pinky]
  palm_width: number;
}

export interface Geometry {
  heart?: LineGeometry | null;
  head?: LineGeometry | null;
  life?: LineGeometry | null;
  fate?: LineGeometry | null;
  hand?: HandSignature | null;
}

/** Parse/validate a client-supplied hand signature (untrusted capture_meta) — null if malformed. */
export function parseHandSignature(raw: unknown): HandSignature | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const fingers = o.fingers;
  const palmWidth = o.palm_width;
  if (!Array.isArray(fingers) || fingers.length !== 4) return null;
  if (!fingers.every((f) => typeof f === 'number' && Number.isFinite(f) && f > 0 && f < 5)) return null;
  if (typeof palmWidth !== 'number' || !Number.isFinite(palmWidth) || palmWidth <= 0 || palmWidth >= 5) return null;
  return { fingers: fingers as number[], palm_width: palmWidth };
}

/** Mean absolute component difference between two hand signatures (0 = identical shape). */
export function handDistance(a: HandSignature, b: HandSignature): number {
  let sum = Math.abs(a.palm_width - b.palm_width);
  for (let i = 0; i < 4; i++) sum += Math.abs((a.fingers[i] ?? 0) - (b.fingers[i] ?? 0));
  return sum / 5;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const norm = (p: Point): Point => [r3(p[0] / 1000), r3(p[1] / 1000)];

function lineGeom(pts?: Point[]): LineGeometry | null {
  if (!pts || pts.length < 2) return null;
  let length = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    cx += pts[i][0];
    cy += pts[i][1];
    if (i > 0) length += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return {
    length: r3(length / 1000),
    start: norm(pts[0]),
    end: norm(pts[pts.length - 1]),
    centroid: norm([cx / pts.length, cy / pts.length]),
  };
}

/** Derive the scale-invariant geometry signature from the extracted line_geometry. */
export function deriveGeometry(features: Record<string, unknown>): Geometry {
  const g = (features.line_geometry ?? {}) as Record<string, Point[]>;
  return {
    heart: lineGeom(g.heart_line),
    head: lineGeom(g.head_line),
    life: lineGeom(g.life_line),
    fate: lineGeom(g.fate_line),
  };
}

/** Euclidean-ish distance between two geometry signatures (0 = identical). P5.T3 uses a threshold. */
export function geometryDistance(a: Geometry, b: Geometry): number {
  // Lines only — the `hand` signature has its own matcher (handDistance / matchSubjectByHand).
  const keys = ['heart', 'head', 'life', 'fate'] as const;
  let sum = 0;
  let n = 0;
  for (const k of keys) {
    const la = a[k];
    const lb = b[k];
    if (!la || !lb) continue;
    sum +=
      Math.abs(la.length - lb.length) +
      Math.hypot(la.start[0] - lb.start[0], la.start[1] - lb.start[1]) +
      Math.hypot(la.end[0] - lb.end[0], la.end[1] - lb.end[1]) +
      Math.hypot(la.centroid[0] - lb.centroid[0], la.centroid[1] - lb.centroid[1]);
    n++;
  }
  return n === 0 ? Infinity : sum / n;
}
