// Pure geometry for the palm line-diagram (P6.T2 / UIUX §2.5). The user's own `line_geometry`
// (Backend §6.2 — sampled points in a 0–1000 normalized frame) is rendered as engraved ink polylines
// with a per-line cinnabar highlight. This is the reveal hero, the per-section highlight, and (via
// the same math in `_shared/card-svg.ts`) the share-card hero — the trust artifact "these are *my*
// lines". No React/RN imports, so it is unit-testable and importable by the Deno contact-sheet verifier.

export type Point = [number, number];
export type LineGeometry = Record<string, Point[]>;

/** The four major lines in classical reading order, with their CJK labels (UIUX §1.2 / §2.5). */
export const MAJOR_LINES = ['heart_line', 'head_line', 'life_line', 'fate_line'] as const;
/** Traditional CJK labels — kept as raw data for the optional zh "traditional view" + card-svg. */
export const LINE_LABEL: Record<string, string> = {
  heart_line: '心',
  head_line: '智',
  life_line: '命',
  fate_line: '运',
};
/** English-first labels — the redesign default (heritage CJK is opt-in only, §2). */
export const ENGLISH_LINE_LABEL: Record<string, string> = {
  heart_line: 'Heart',
  head_line: 'Head',
  life_line: 'Life',
  fate_line: 'Fate',
};

/** At or below this render size a diagram is a **mini** (section thumb, history row, pair, share). */
export const MINI_MAX_SIZE = 96;

export interface DiagramWeights {
  /** True when the diagram renders at thumbnail scale. */
  isMini: boolean;
  /** Main ink stroke width, in the 0–1000 frame (multiply by `size / 1000`). */
  ink: number;
  /** Main ink width for the highlighted line. */
  inkHighlighted: number;
  /** Soft wide underlay behind an ordinary line (the engraved/embossed feel). */
  underlay: number;
  /** Underlay behind the highlighted line — the accent glow. */
  underlayHighlighted: number;
  /** Ordinary underlay's stroke opacity. */
  underlayOpacity: number;
  /** The glow's opacity before it blooms, and where it settles. */
  glowOpacityBase: number;
  glowOpacityRest: number;
  /** Opacity of the hand silhouette group behind the lines. */
  silhouetteOpacity: number;
}

/**
 * Stroke weights + opacities for a given render size (Audit-4 CO-5).
 *
 * The bug this fixes: minis doubled the **ink** (F0.11, so the creases read at 64px) but left the
 * underlay at its hero width. That collapsed the halo-to-ink ratio from ~2.9× to ~1.4× — the glow
 * stopped being a glow and became a slightly fatter copy of the stroke, so the section thumb's
 * "this is YOUR heart line, lit" moment was invisible at exactly the size it mattered most. Here the
 * underlay scales with the ink, so the ratio is **size-invariant**, and the mini glow rests brighter
 * because a 2.5px halo has far fewer pixels to carry the signal than a 12px one.
 *
 * Pure (no React/RN), so the ratios are unit-tested rather than eyeballed in a screenshot.
 */
export function diagramWeights(size: number): DiagramWeights {
  const isMini = size <= MINI_MAX_SIZE;
  const k = isMini ? 2 : 1; // the F0.11 legibility factor — now applied to BOTH layers
  return {
    isMini,
    ink: 4.5 * k,
    inkHighlighted: 7 * k,
    underlay: 14 * k,
    underlayHighlighted: 20 * k,
    underlayOpacity: 0.08,
    glowOpacityBase: isMini ? 0.1 : 0.06,
    glowOpacityRest: isMini ? 0.3 : 0.18,
    silhouetteOpacity: isMini ? 0.1 : 0.05,
  };
}

const r1 = (n: number): number => Math.round(n * 10) / 10;
const isMajor = (l: string): boolean => (MAJOR_LINES as readonly string[]).includes(l);
const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

/** Catmull-Rom → cubic bezier so a few sampled points read as a smooth engraved crease. */
export function smoothPath(pts: Point[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${r1(pts[0][0])} ${r1(pts[0][1])}`;
  let d = `M ${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${r1(c1x)} ${r1(c1y)}, ${r1(c2x)} ${r1(c2y)}, ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

export type LabelAnchor = 'start' | 'middle' | 'end';

export interface DiagramStroke {
  line: string;
  d: string; // SVG path `d` in the target `size` frame
  highlighted: boolean; // drawn in the accent
  /** Approx polyline length in the `size` frame — seeds the draw-on `strokeDasharray`. */
  length: number;
  /** Label pinned to a screen-edge margin with a per-line `anchor` so text never clips or
   *  overlaps a line; `y` tracks the line, nudged so neighbours (heart/head) don't collide. */
  label?: { text: string; x: number; y: number; anchor: LabelAnchor };
}

/**
 * Per-line label placement (redesign v2 V6 — fixes the Fate/Heart overlap + edge clipping). Each
 * label is pinned to an outer margin and grown *inward* via its `anchor`, so a right-ending line's
 * label sits in the right gutter (anchor `end`, never clipping), a left/bottom line in its gutter,
 * and heart vs head are pushed apart vertically. `edge` picks the margin; `ny` is the vertical
 * nudge (in the 1000-frame) applied to the line's own endpoint y.
 */
const LABEL_LAYOUT: Record<string, { edge: 'left' | 'right' | 'center'; ny: number }> = {
  heart_line: { edge: 'right', ny: -30 },
  head_line: { edge: 'right', ny: 30 },
  life_line: { edge: 'left', ny: 20 },
  fate_line: { edge: 'center', ny: 0 },
};

export interface DiagramOptions {
  size?: number; // output viewport (square), default 1000
  highlightedLine?: string; // the line being discussed → cinnabar
  signatureLines?: string[]; // highlighted by default (hero) when no explicit highlightedLine
}

/**
 * Build the ordered engraved strokes for a palm diagram. Deterministic: same geometry + options →
 * identical paths. Major lines are emitted first (stable stacking) then any extra lines. Colours are
 * left to the renderer (`highlighted` = cinnabar) so this stays theme-agnostic.
 */
export function buildDiagram(geometry: LineGeometry, opts: DiagramOptions = {}): DiagramStroke[] {
  const size = opts.size ?? 1000;
  const hi = opts.highlightedLine;
  const sig = new Set(opts.signatureLines ?? []);
  const scale = (p: Point): Point => [r1((p[0] / 1000) * size), r1((p[1] / 1000) * size)];
  const names = Object.keys(geometry);
  const ordered = [...names.filter(isMajor).sort((a, b) => MAJOR_LINES.indexOf(a as never) - MAJOR_LINES.indexOf(b as never)), ...names.filter((l) => !isMajor(l))];

  // Screen-edge gutter so a label's anchor never sits on the frame edge.
  const gutter = (56 / 1000) * size;
  const clampY = (y: number) => Math.min(Math.max(y, gutter), size - gutter);

  const out: DiagramStroke[] = [];
  for (const line of ordered) {
    const pts = geometry[line];
    if (!Array.isArray(pts) || pts.length < 2) continue;
    const mapped = pts.map(scale);
    const highlighted = hi ? line === hi : sig.has(line);
    const label = LINE_LABEL[line];
    const end = mapped[mapped.length - 1];
    let length = 0;
    for (let i = 1; i < mapped.length; i++) {
      length += Math.hypot(mapped[i][0] - mapped[i - 1][0], mapped[i][1] - mapped[i - 1][1]);
    }
    let labelObj: DiagramStroke['label'];
    if (label) {
      const lay = LABEL_LAYOUT[line] ?? { edge: 'right' as const, ny: 0 };
      const x = lay.edge === 'left' ? gutter : lay.edge === 'center' ? size / 2 : size - gutter;
      const anchor: LabelAnchor = lay.edge === 'left' ? 'start' : lay.edge === 'center' ? 'middle' : 'end';
      const y = clampY(end[1] + (lay.ny / 1000) * size);
      labelObj = { text: label, x: r1(x), y: r1(y), anchor };
    }
    out.push({ line, d: smoothPath(mapped), highlighted, length: r1(length), label: labelObj });
  }
  return out;
}

// ── Hand silhouette (audit F0.11 — the #1 craft fix) ──────────────────────────────────────────────

export interface HandSilhouette {
  /** Filled subpaths (1000-frame) — a palm + four fingers + a thumb. Rendered as separate fills
   *  inside one low-opacity group so overlaps merge cleanly (no winding/seam artifacts). */
  parts: string[];
  /** The palm rectangle (1000-frame). Every line point is guaranteed to sit inside it — the
   *  containment invariant so engraved lines can never overshoot the hand. */
  palm: { x0: number; y0: number; x1: number; y1: number };
}

/** Bounding box of every point across all lines (1000-frame); a centered default for empty geometry. */
function pointsBounds(geometry: LineGeometry): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const pts of Object.values(geometry)) {
    if (!Array.isArray(pts)) continue;
    for (const p of pts) {
      if (!Array.isArray(p) || p.length < 2) continue;
      x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]);
      x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]);
    }
  }
  if (!Number.isFinite(x0)) return { x0: 300, y0: 320, x1: 700, y1: 760 };
  return { x0, y0, x1, y1 };
}

/** A rounded-rectangle subpath (clockwise). */
function roundRect(x0: number, y0: number, x1: number, y1: number, r: number): string {
  const rr = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
  return [
    `M ${r1(x0 + rr)} ${r1(y0)}`,
    `L ${r1(x1 - rr)} ${r1(y0)} Q ${r1(x1)} ${r1(y0)} ${r1(x1)} ${r1(y0 + rr)}`,
    `L ${r1(x1)} ${r1(y1 - rr)} Q ${r1(x1)} ${r1(y1)} ${r1(x1 - rr)} ${r1(y1)}`,
    `L ${r1(x0 + rr)} ${r1(y1)} Q ${r1(x0)} ${r1(y1)} ${r1(x0)} ${r1(y1 - rr)}`,
    `L ${r1(x0)} ${r1(y0 + rr)} Q ${r1(x0)} ${r1(y0)} ${r1(x0 + rr)} ${r1(y0)} Z`,
  ].join(' ');
}

/** A tapered digit: a flat `base` (half-width `rBase`, sinks into the palm) narrowing to a rounded
 *  `tip` (half-width `rTip`) — so fingers read as fingers, not uniform capsules/sausages. */
function taperedDigit(bx: number, by: number, tx: number, ty: number, rBase: number, rTip: number): string {
  const dx = tx - bx, dy = ty - by;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len, ny = dy / len; // axis base→tip
  const px = -ny, py = nx; // perpendicular
  const k = rTip * 1.33; // cubic control → ~semicircular tip cap
  return [
    `M ${r1(bx + px * rBase)} ${r1(by + py * rBase)}`,
    `L ${r1(tx + px * rTip)} ${r1(ty + py * rTip)}`,
    `C ${r1(tx + px * rTip + nx * k)} ${r1(ty + py * rTip + ny * k)} ${r1(tx - px * rTip + nx * k)} ${r1(ty - py * rTip + ny * k)} ${r1(tx - px * rTip)} ${r1(ty - py * rTip)}`,
    `L ${r1(bx - px * rBase)} ${r1(by - py * rBase)} Z`,
  ].join(' ');
}

/**
 * Build a credible upright five-digit hand silhouette (1000-frame) whose PALM encloses every line
 * point, so the engraved creases can never overshoot the hand (audit F0.11). The palm is the inflated
 * crease bounding box (clamped for proportion, then re-expanded so containment always holds); four
 * fingers rise into the headroom above it (middle longest, a slight outward fan) and an articulated
 * thumb comes off the lower-left. Pure — unit-testable; the returned `palm` is the containment
 * invariant the tests assert. Replaces the old hand-tuned "mitten" that let lines float past its edge.
 */
export function handSilhouette(geometry: LineGeometry): HandSilhouette {
  const F = 1000;
  const b = pointsBounds(geometry);
  const W0 = Math.max(b.x1 - b.x0, F * 0.12);
  const H0 = Math.max(b.y1 - b.y0, F * 0.12);
  // Inflate the crease bbox to a palm, clamped to keep the hand well-proportioned…
  let L = clamp(b.x0 - W0 * 0.16, F * 0.06, F * 0.28);
  let R = clamp(b.x1 + W0 * 0.1, F * 0.72, F * 0.95);
  let T = clamp(b.y0 - H0 * 0.1, F * 0.24, F * 0.44);
  let B = clamp(b.y1 + H0 * 0.06, F * 0.72, F * 0.97);
  // …then re-expand so the palm STRICTLY encloses every point regardless of the clamps.
  const eps = F * 0.008;
  L = Math.min(L, b.x0 - eps);
  R = Math.max(R, b.x1 + eps);
  T = Math.min(T, b.y0 - eps);
  B = Math.max(B, b.y1 + eps);

  const Wp = R - L, Hp = B - T;
  const cxMid = (L + R) / 2;
  const palm = roundRect(L, T, R, B, Wp * 0.2); // softer heel/corners so the palm reads less boxy

  // Four tapered fingers rising into the headroom (the frame-top → palm-top gap), their bases set on
  // a gentle knuckle arch (middle knuckle highest, pinky lowest) and each narrowing to a rounded tip.
  const headroom = T;
  const bandL = L + Wp * 0.14, bandR = R - Wp * 0.01;
  const slot = (bandR - bandL) / 4;
  const rf = (slot * 0.68) / 2;
  const lenFrac = [0.8, 0.95, 0.87, 0.66]; // index · middle · ring · pinky
  const archY = [0.012, 0, 0.006, 0.03]; // per-finger base dip (knuckle arch), as a fraction of F
  const fingers = lenFrac.map((frac, i) => {
    const cx = bandL + slot * i + slot / 2;
    const baseY = T + rf * 0.9 + archY[i] * F; // sunk into the palm so the flat base merges
    const tipY = Math.max(F * 0.03, T - headroom * frac * 0.9);
    const lean = (cx - cxMid) * 0.14; // slight outward fan
    return taperedDigit(cx, baseY, cx + lean, tipY, rf, rf * 0.62);
  });

  // An articulated thumb off the lower-left, angled up-and-out, thick at the base → rounded tip.
  const thumb = taperedDigit(
    L + Wp * 0.1, T + Hp * 0.44,
    Math.max(F * 0.03, L - Wp * 0.05), T + Hp * 0.04,
    Wp * 0.095, Wp * 0.06,
  );

  return { parts: [palm, ...fingers, thumb], palm: { x0: r1(L), y0: r1(T), x1: r1(R), y1: r1(B) } };
}

/**
 * Derive a visibly DIFFERENT partner geometry from a base (audit F0.11 — the pair must never look
 * cloned). Mirrors horizontally and applies a small DETERMINISTIC per-line nudge + wobble (no RNG,
 * so it's stable across renders/tests). Pure.
 */
export function differentiateGeometry(geometry: LineGeometry): LineGeometry {
  const out: LineGeometry = {};
  Object.keys(geometry).forEach((line, li) => {
    const pts = geometry[line];
    if (!Array.isArray(pts)) return;
    const ox = (li % 2 === 0 ? -1 : 1) * (12 + li * 6);
    const oy = (li % 2 === 0 ? 1 : -1) * (18 + li * 9);
    out[line] = pts.map(([x, y], pi) => {
      const wobble = Math.sin((pi + li) * 1.3) * 10;
      return [clamp(1000 - x + ox + wobble, 20, 980), clamp(y + oy, 20, 980)] as Point;
    });
  });
  return out;
}
