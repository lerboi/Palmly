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

const r1 = (n: number): number => Math.round(n * 10) / 10;
const isMajor = (l: string): boolean => (MAJOR_LINES as readonly string[]).includes(l);

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
