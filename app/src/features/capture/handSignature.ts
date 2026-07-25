/**
 * The scale-invariant hand-shape signature used for subject identity matching (Backend §6.6
 * item 3 — "landmark geometry (scale-invariant ratios)"). Computed from the 21 canonical-space
 * landmarks `canonicalizePalm` returns: the cv1 warp pins wrist→middle-MCP to a fixed vertical
 * segment, so canonical coordinates are already normalized for scale/rotation/translation —
 * chain lengths in this space ARE ratios to palm height.
 *
 * Why these components: finger CHAIN lengths (MCP→PIP→DIP→TIP) are splay-invariant (splaying
 * rotates a finger, preserving its length) and the §2.3 flatness gate bounds curl-induced
 * projection loss; palm width (index-MCP↔pinky-MCP) captures the palm's aspect. The thumb is
 * deliberately EXCLUDED — it is the most pose-variable digit (adduction rotates it out of
 * plane, shrinking its projected length unpredictably).
 *
 * This exists because matching on Gemini's extracted line_geometry failed live (2026-07-25:
 * same palm twice → distance 0.156 vs the 0.08 threshold — the model re-draws lines with
 * ±0.02–0.07 coordinate variance). MediaPipe landmarks on a canonicalized crop are stable.
 */
export interface HandSignature {
  /** Index, middle, ring, pinky chain lengths (palm-height-normalized canonical units). */
  fingers: [number, number, number, number];
  /** Distance index-MCP(5) ↔ pinky-MCP(17). */
  palm_width: number;
}

const r4 = (n: number) => Math.round(n * 10000) / 10000;

const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Sum of segment lengths along a landmark index chain. */
function chainLength(pts: [number, number][], chain: number[]): number {
  let len = 0;
  for (let i = 1; i < chain.length; i++) len += dist(pts[chain[i - 1]], pts[chain[i]]);
  return len;
}

/** Compute the signature from 21 canonical-space landmarks; null if the array is short. */
export function handSignature(landmarks: [number, number][]): HandSignature | null {
  if (landmarks.length < 21) return null;
  return {
    fingers: [
      r4(chainLength(landmarks, [5, 6, 7, 8])),
      r4(chainLength(landmarks, [9, 10, 11, 12])),
      r4(chainLength(landmarks, [13, 14, 15, 16])),
      r4(chainLength(landmarks, [17, 18, 19, 20])),
    ],
    palm_width: r4(dist(landmarks[5], landmarks[17])),
  };
}
