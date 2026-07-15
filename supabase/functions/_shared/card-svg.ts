// Share-card SVG generator (UIUX §3 — the core viral asset). Server-rendered so every card is
// pixel-identical, localized, and pre-rendered before share (§3, Backend §8). Built as SVG (not
// satori/HTML-CSS) because THE HERO is the user's own traced palm lines — an engraved line diagram
// unique to them (the moat, §3.2). Pure + deterministic → unit-testable; the edge function
// rasterizes it to PNG via resvg. Solo-palm variant; feed 4:5 + story 9:16.

import { LIGHT } from './palette.ts';

export type CardVariant = 'feed_4x5' | 'story_9x16';
export type Point = [number, number];

// Vermilion skin (redesign v2 §3/§7) — sourced from the ONE shared `_shared/palette.ts` so the
// in-app share preview (`ShareView`), this posted image, and the invite page can't drift (V21 kills
// the old "kept in sync manually" copy). The card always renders light — a posted image on warm
// paper. Local names map to shared roles; the three-reds discipline (§3.2) is honored: signature
// palm lines use `accent` (vermilion); the corner seal uses `heritage` (deep claret) — never the
// bright accent.
const PALETTE = {
  bg: LIGHT.bg, // warm-white paper field (role: bg)
  paper: LIGHT.surface, // the raised card surface (role: surface)
  edge: LIGHT.border, // hairline (role: border)
  ink: LIGHT.ink, // role: textPrimary
  inkWash: LIGHT.inkWash, // role: textSecondary
  accent: LIGHT.accent, // ★ vermilion — signature / highlighted palm lines (role: accent, §3.2)
  accentMuted: LIGHT.accentMuted, // tonal trait chips (role: accentMuted)
  heritage: LIGHT.heritage, // deep claret — the corner seal ONLY (role: heritageAccent, §3.2)
};

// Faint hand silhouette (0–1000 frame, mirrors PalmDiagram) so the lines read as a palm.
const HAND_SILHOUETTE =
  'M235 560 C210 470 218 420 246 414 C250 356 250 298 286 298 C322 298 322 356 324 414 L352 414 C356 338 360 250 400 250 C440 250 444 340 446 420 L474 420 C478 348 486 270 520 272 C554 274 552 352 548 424 L574 424 C584 372 606 330 634 346 C664 364 646 454 626 522 C704 548 764 622 744 728 C716 858 560 942 430 930 C300 918 250 840 232 720 C152 700 150 612 235 560 Z';

const DIMS: Record<CardVariant, { w: number; h: number }> = {
  feed_4x5: { w: 1080, h: 1350 },
  story_9x16: { w: 1080, h: 1920 },
};

// Vertical budget per variant: headline (top) → hero diagram → chips → footer rail (bottom).
// hero is sized to leave room for chips above the footer (fixes the earlier off-card overflow).
const LAYOUT: Record<CardVariant, { headlineY: number; heroTop: number; heroSize: number }> = {
  feed_4x5: { headlineY: 180, heroTop: 360, heroSize: 700 },
  story_9x16: { headlineY: 300, heroTop: 560, heroSize: 800 },
};

// The four majors → their English label (redesign §2/§7 — CJK dropped from the default surface).
const LINE_LABEL: Record<string, string> = {
  heart_line: 'Heart',
  head_line: 'Head',
  life_line: 'Life',
  fate_line: 'Fate',
};

export interface CardInput {
  variant: CardVariant;
  headline: string;
  chips: string[]; // ≤3 (anti-clutter rule §3.2)
  lineGeometry: Record<string, Point[]>; // 0–1000 normalized frame (as stored)
  signatureLines?: string[]; // ≤2 lines drawn in cinnabar
  attribution?: string; // first name (optional)
  domain?: string; // default 'palmly.app'
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const r1 = (n: number): number => Math.round(n * 10) / 10;

/** Catmull-Rom → cubic bezier so few sampled points read as a smooth engraved crease. */
function smoothPath(pts: Point[]): string {
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

/** Word-wrap a headline into ≤maxLines lines of ≤maxChars, as <tspan> rows. */
function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
    if (lines.length === maxLines - 1 && cur.length > maxChars) break;
  }
  if (cur) lines.push(cur.trim());
  return lines.slice(0, maxLines);
}

export function buildCardSvg(input: CardInput): string {
  const { w, h } = DIMS[input.variant];
  const domain = input.domain ?? 'palmly.app';
  const sig = new Set(input.signatureLines ?? ['heart_line', 'fate_line']);
  const pad = 64;

  // ── hero box: a square region for the palm diagram, sized to leave room for chips + footer ──
  const L = LAYOUT[input.variant];
  const heroTop = L.heroTop;
  const heroSize = L.heroSize;
  const heroX = (w - heroSize) / 2;
  const heroY = heroTop;
  const mapPt = (p: Point): Point => [heroX + (p[0] / 1000) * heroSize, heroY + (p[1] / 1000) * heroSize];

  // Faint hand silhouette behind the lines (negative space → reads as a palm, matches the app).
  const silhouette =
    `<g transform="translate(${r1(heroX)},${r1(heroY)}) scale(${r1(heroSize / 1000)})">` +
    `<path d="${HAND_SILHOUETTE}" fill="${PALETTE.ink}" fill-opacity="0.04" stroke="${PALETTE.inkWash}" stroke-opacity="0.14" stroke-width="2" stroke-linejoin="round"/></g>`;

  const strokes: string[] = [];
  const labels: string[] = [];
  for (const [line, pts] of Object.entries(input.lineGeometry)) {
    if (!Array.isArray(pts) || pts.length < 2) continue;
    const mapped = pts.map(mapPt);
    const d = smoothPath(mapped);
    const color = sig.has(line) ? PALETTE.accent : PALETTE.ink;
    // underlay (soft) + main stroke → an engraved/embossed feel
    strokes.push(`<path d="${d}" fill="none" stroke="${PALETTE.ink}" stroke-opacity="0.10" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>`);
    strokes.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${sig.has(line) ? 6 : 4.5}" stroke-linecap="round" stroke-linejoin="round"/>`);
    const label = LINE_LABEL[line];
    if (label) {
      const end = mapped[mapped.length - 1];
      labels.push(`<text x="${r1(end[0] + 18)}" y="${r1(end[1] + 8)}" font-family="Noto Sans, sans-serif" font-size="30" fill="${PALETTE.inkWash}">${label}</text>`);
    }
  }

  // ── headline (bold sans display, ink, ≤2 lines, largest element — the server can't bundle the
  //    app's editorial serif, so the posted card uses a heavy system sans; the serif hero stays
  //    in-app on Reveal) ──
  const hlSize = input.headline.length > 34 ? 58 : 66;
  const hlLines = wrapLines(input.headline, 26, 2);
  const headline = hlLines
    .map((ln, i) => `<tspan x="${pad}" dy="${i === 0 ? 0 : hlSize * 1.15}">${esc(ln)}</tspan>`)
    .join('');

  // ── trait chips (≤3, tonal accentMuted — matches the app's branded pills) below the hero ──
  const chipY = heroY + heroSize + 44;
  let chipX = pad;
  const chips: string[] = [];
  for (const c of input.chips.slice(0, 3)) {
    const cw = 34 + c.length * 20;
    chips.push(
      `<rect x="${chipX}" y="${chipY}" rx="30" ry="30" width="${cw}" height="60" fill="${PALETTE.accentMuted}"/>` +
        `<text x="${chipX + cw / 2}" y="${chipY + 40}" text-anchor="middle" font-family="Noto Sans, sans-serif" font-size="28" fill="${PALETTE.accent}">${esc(c)}</text>`,
    );
    chipX += cw + 22;
  }

  // ── footer rail: CJK-free logomark stamp + domain + optional attribution ──
  const railY = h - 96;
  const stampScale = 56 / 48; // the Logomark stamp is a 48-frame tile
  const seal =
    `<g transform="translate(${pad},${railY - 6}) scale(${r1(stampScale)})">` +
    `<rect x="3" y="3" width="42" height="42" rx="10" fill="none" stroke="${PALETTE.heritage}" stroke-width="2.6"/>` +
    `<g fill="none" stroke="${PALETTE.heritage}" stroke-width="3" stroke-linecap="round">` +
    `<path d="M19.5 12.5 C14 18.5 13 28 18.5 36"/>` +
    `<path d="M11.5 24.5 C20 21.5 29.5 22.5 35.5 26"/>` +
    `<path d="M12 18.5 C20 14 30 15 36.5 19.5"/>` +
    `</g></g>`;
  const brand =
    `<text x="${pad + 74}" y="${railY + 34}" font-family="Noto Sans, sans-serif" font-size="30" fill="${PALETTE.ink}">${esc(domain)}</text>` +
    (input.attribution
      ? `<text x="${w - pad}" y="${railY + 34}" text-anchor="end" font-family="Noto Sans, sans-serif" font-size="28" fill="${PALETTE.inkWash}">${esc(input.attribution)}</text>`
      : '');

  // ── QR placeholder (story variant only, corner) — real code wired in the share flow (P8.T2/T3) ──
  const qr =
    input.variant === 'story_9x16'
      ? `<g transform="translate(${w - pad - 150}, ${heroTop - 190})"><rect width="150" height="150" fill="none" stroke="${PALETTE.edge}" stroke-width="3"/>` +
        `<rect x="16" y="16" width="34" height="34" fill="${PALETTE.ink}"/><rect x="100" y="16" width="34" height="34" fill="${PALETTE.ink}"/><rect x="16" y="100" width="34" height="34" fill="${PALETTE.ink}"/>` +
        `<text x="75" y="180" text-anchor="middle" font-family="Noto Sans, sans-serif" font-size="20" fill="${PALETTE.inkWash}">scan to compare</text></g>`
      : '';

  // Warm-paper field + a raised white surface panel with soft depth (matches the in-app ShareView
  // preview — a premium card on paper, not a flat white rectangle).
  const panelInset = 28;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="12" stdDeviation="26" flood-color="${PALETTE.ink}" flood-opacity="0.10"/>
  </filter></defs>
  <rect width="${w}" height="${h}" fill="${PALETTE.bg}"/>
  <rect x="${panelInset}" y="${panelInset}" width="${w - panelInset * 2}" height="${h - panelInset * 2}" rx="40" fill="${PALETTE.paper}" stroke="${PALETTE.edge}" stroke-width="2" filter="url(#cardShadow)"/>
  <text x="${pad}" y="${L.headlineY}" font-family="Noto Sans, sans-serif" font-size="${hlSize}" font-weight="800" fill="${PALETTE.ink}">${headline}</text>
  ${silhouette}
  ${strokes.join('\n  ')}
  ${labels.join('\n  ')}
  ${qr}
  ${chips.join('\n  ')}
  ${seal}
  ${brand}
</svg>`;
}

// ── Derive the card's headline + chips + signature lines from extracted features (deterministic) ──
type Rec = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

const HAND_HEADLINE: Record<string, string> = {
  earth: 'An Earth hand — steady to the core.',
  water: 'A Water hand — feeling runs deep.',
  fire: 'A Fire hand — bold and burning bright.',
  air: 'An Air hand — a mind always in motion.',
  mixed: 'A Mixed hand — many natures in one.',
};

export interface CardContent {
  headline: string;
  chips: string[];
  signatureLines: string[];
}

export function deriveCardContent(features: Rec): CardContent {
  const hand = str(features.hand_shape) ?? 'mixed';
  const headline = HAND_HEADLINE[hand] ?? HAND_HEADLINE.mixed;

  const chips: string[] = [];
  const heart = features.heart_line as Rec | undefined;
  const head = features.head_line as Rec | undefined;
  const fate = features.fate_line as Rec | undefined;
  if (heart && str(heart.depth) === 'deep') chips.push('Deep heart line');
  if (fate && str(fate.present) === 'clear') chips.push('Clear fate line');
  if (head && str(head.length) === 'long') chips.push('Long head line');
  const mounts = Array.isArray(features.mounts) ? (features.mounts as Rec[]) : [];
  const prominent = mounts.find((m) => str(m.prominence) === 'prominent');
  if (prominent && chips.length < 3) chips.push(`${cap(String(prominent.name).replace('_', ' '))} mount`);
  if (chips.length === 0) chips.push(`${cap(hand)} hand`); // always ≥1 chip
  const finalChips = chips.slice(0, 3);

  // signature (cinnabar) lines: heart is always one; the other = fate if clear, else head, else life.
  const second = fate && str(fate.present) === 'clear' ? 'fate_line' : head && str(head.length) === 'long' ? 'head_line' : 'life_line';
  return { headline, chips: finalChips, signatureLines: ['heart_line', second] };
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
