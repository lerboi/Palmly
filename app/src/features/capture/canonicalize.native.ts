import { canonicalizePalm, canonicalizeRegion } from 'palm-landmarks';
import type { CanonicalizedPalm } from './canonicalize';
import { handSignature } from './handSignature';

export type { CanonicalizedPalm } from './canonicalize';

/**
 * P4.T3 — run the pinned cv1 canonicalization (still-image landmark detect → wrist/middle-MCP
 * similarity warp → 1536×1536 → deterministic CLAHE → JPEG q85) on a captured or picked palm
 * photo. Returns null instead of throwing: "no hand in this photo" is an expected outcome for
 * library picks, and the caller's contract is fall back to the raw upload with
 * `capture_meta.cv='none'` (worker-side `not_a_hand` stays the honest gate).
 */
export async function tryCanonicalizePalm(uri: string): Promise<CanonicalizedPalm | null> {
  try {
    const res = await canonicalizePalm(uri);
    const landmarks = res.landmarks.map((p) => [p.x, p.y] as [number, number]);
    return {
      uri: `file://${res.filePath}`,
      landmarks,
      handGeometry: handSignature(landmarks),
    };
  } catch (e) {
    if (__DEV__) console.log('[P4] canonicalize → raw fallback:', String(e));
    return null;
  }
}

/** Face variant (P4.T5): crop the region the live detector saw at shutter time. */
export async function tryCanonicalizeFace(
  uri: string,
  region: { centerX: number; centerY: number; sizeFraction: number },
): Promise<string | null> {
  try {
    const path = await canonicalizeRegion(uri, region.centerX, region.centerY, region.sizeFraction);
    return `file://${path}`;
  } catch (e) {
    if (__DEV__) console.log('[P4] face canonicalize → raw fallback:', String(e));
    return null;
  }
}
