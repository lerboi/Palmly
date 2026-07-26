import { handSignature, type HandSignature } from '@/features/capture/handSignature';

/**
 * The on-device same-palm check (Audit-5 · 03 §4.3, RF3.T1).
 *
 * The whole cost of this feature: **zero.** No photo is taken, nothing is uploaded, no model is
 * called. The live MediaPipe landmarks the capture engine already produces are normalized into the
 * cv1 canonical frame here, reduced to the same 5-number signature the pipeline enrolled, and
 * compared with a distance function. That is the entire ritual, and it is why "sealing the day
 * happens on your phone" is a headline rather than a footnote (01 §3).
 *
 * Mirrors `_shared/features.ts handDistance` exactly — the enrolled signature was computed by the
 * server-side pipeline from a canonicalized still, so a different distance metric here would be
 * comparing two things that were never comparable.
 */

/**
 * The cv1 canonical frame pins wrist(0)→(768,1330) and middle-MCP(9)→(768,770) in a 1536px square
 * (`Canonicalizer.kt`). Normalized, that makes the wrist→MCP span exactly 560/1536 — and because
 * `handSignature` measures only DISTANCES, reproducing the warp reduces to reproducing its SCALE.
 * Rotation and translation cannot change a distance, so they are not computed.
 */
export const CANONICAL_PALM_SPAN = 560 / 1536;

/**
 * Match threshold for the check-in (03 §4.3).
 *
 * Deliberately LOOSER than the pipeline's 0.025: the stakes are opposite. In the pipeline a false
 * positive would hand someone another person's reading, so it is tight. Here a false NEGATIVE tells
 * a user their own hand is not their own — hostile, and wrong — while a false positive costs
 * nothing at all, because the tap fallback already seals the day unconditionally. Provisional,
 * calibrated with the other thresholds at P12 (Decision Log 2026-07-26).
 */
export const SEAL_MATCH_THRESHOLD = 0.035;

const dist = (a: readonly [number, number], b: readonly [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * Normalize live landmarks into canonical scale and reduce them to a signature.
 *
 * `landmarks` must be in an ASPECT-CORRECT space (pixels, or normalized coordinates already
 * multiplied by frame width/height). Normalized 0–1 coordinates fed in raw would carry the frame's
 * aspect ratio into every distance and make a 16:9 phone disagree with itself in portrait.
 *
 * Returns null when the hand is missing landmarks or the wrist and middle-MCP coincide — a
 * degenerate pose the warp itself rejects.
 */
export function canonicalSignatureFromLive(landmarks: readonly (readonly [number, number])[]): HandSignature | null {
  if (landmarks.length < 21) return null;
  const span = dist(landmarks[0], landmarks[9]);
  if (!Number.isFinite(span) || span <= 0) return null;
  const scale = CANONICAL_PALM_SPAN / span;
  return handSignature(landmarks.map((p) => [p[0] * scale, p[1] * scale] as [number, number]));
}

/**
 * Anything with four finger chains and a palm width.
 *
 * Deliberately looser than {@link HandSignature}'s fixed 4-tuple: the ENROLLED signature is parsed
 * out of stored JSON (`StoredHandSignature`), so its `fingers` is a validated-but-plain array. The
 * comparison only ever indexes 0–3, so requiring a tuple here would force a cast at every call site
 * — and a cast is exactly the thing that would let a malformed signature through unnoticed.
 */
export interface SignatureLike {
  fingers: readonly number[];
  palm_width: number;
}

/** Mean absolute component difference between two signatures (0 = identical). Mirrors the server. */
export function handDistanceLocal(a: SignatureLike, b: SignatureLike): number {
  let sum = Math.abs(a.palm_width - b.palm_width);
  for (let i = 0; i < 4; i++) sum += Math.abs((a.fingers[i] ?? 0) - (b.fingers[i] ?? 0));
  return sum / 5;
}

/** Is this the enrolled palm? A missing signature on either side is "unknown", never "no". */
export function isSamePalm(live: SignatureLike | null, enrolled: SignatureLike | null, threshold = SEAL_MATCH_THRESHOLD): boolean {
  if (!live || !enrolled) return false;
  return handDistanceLocal(live, enrolled) <= threshold;
}
