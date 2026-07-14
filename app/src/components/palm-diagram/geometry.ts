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

export interface DiagramStroke {
  line: string;
  d: string; // SVG path `d` in the target `size` frame
  highlighted: boolean; // drawn in the accent
  /** Approx polyline length in the `size` frame — seeds the draw-on `strokeDasharray`. */
  length: number;
  label?: { text: string; x: number; y: number };
}

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
    out.push({
      line,
      d: smoothPath(mapped),
      highlighted,
      length: r1(length),
      label: label ? { text: label, x: r1(end[0] + (18 / 1000) * size), y: r1(end[1] + (8 / 1000) * size) } : undefined,
    });
  }
  return out;
}
