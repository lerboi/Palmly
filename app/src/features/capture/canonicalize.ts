/**
 * Web/SSG stub of the P4.T3 canonicalization helpers (`canonicalize.native.ts` is the real one —
 * Metro resolves `.native` on device; both share the `.ts` extension so the per-extension
 * resolution rounds can't pick the stub on device, the P4.T2 Metro lesson). On web there is no
 * native pipeline: callers upload the raw image with `capture_meta.cv = 'none'` and the server
 * remains the honest gate.
 */

import type { HandSignature } from './handSignature';

/** A canonicalized palm crop: the new local URI + the 21 landmarks re-projected into it. */
export interface CanonicalizedPalm {
  uri: string;
  /** Normalized [0,1] coords in the canonical 1536×1536 frame. */
  landmarks: [number, number][];
  /** Scale-invariant hand-shape signature for subject matching (Backend §6.6 item 3). */
  handGeometry: HandSignature | null;
}

export async function tryCanonicalizePalm(_uri: string): Promise<CanonicalizedPalm | null> {
  return null;
}

export async function tryCanonicalizeFace(
  _uri: string,
  _region: { centerX: number; centerY: number; sizeFraction: number },
): Promise<string | null> {
  return null;
}
