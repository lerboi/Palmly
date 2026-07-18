// Generates the Palmly app-icon / splash / favicon PNG set from the Logomark (redesign R7).
// Device-free: renders the mark as inline SVG in headless Chrome at exact pixel sizes. The mark
// geometry is kept in sync with src/components/ui/Logomark.tsx (three palm lines, 48 frame).
//
//   node scripts/gen-brand-assets.mjs
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'assets', 'images');
const TMP = path.resolve(__dirname, '..', '.brand-tmp');
const CHROME = process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// Keep in sync with Logomark.tsx.
const LIFE = 'M19.5 12.5 C14 18.5 13 28 18.5 36';
const HEAD = 'M11.5 24.5 C20 21.5 29.5 22.5 35.5 26';
const HEART = 'M12 18.5 C20 14 30 15 36.5 19.5';

// Vermilion & Motion hexes (skin #3 — the active brand; kept in sync with `vermilionSkin` in
// src/theme/tokens.ts). Indigo is fully retired. The mark carries the color (ink head/life + a
// single vermilion heart whisper, matching Logomark's `ink` tone); the FIELD stays neutral — the
// icon tile is NOT flooded red (v2 §3.1 guardrail).
const C = {
  ink: '#1A1A1F', // textPrimary (light) — head + life lines
  paper: '#FAF9F7', // bg (light) — the neutral icon/splash field
  vermilion: '#D13B27', // accent (light) — the heart-line whisper
  coral: '#FF7C63', // accent (dark) — the heart whisper on the dark splash
  lightMark: '#F4F4F6', // textPrimary (dark) — head + life lines on the dark splash
  darkField: '#14151A', // bg (dark) — reference only; the dark splash bg is set in app.json
};

/**
 * @param {{name:string,size:number,bg:string,mark:string,heart:string,inner:number,w:number}} s
 */
function html(s) {
  // The heart line is heaviest — the engraved focal stroke that carries the accent (Logomark parity).
  const wHeart = (s.w * 1.2).toFixed(2);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0}
    .wrap{width:${s.size}px;height:${s.size}px;display:flex;align-items:center;justify-content:center;background:${s.bg}}
    svg{width:${s.inner}px;height:${s.inner}px}
  </style></head><body><div class="wrap">
    <svg viewBox="0 0 48 48" fill="none" stroke-linecap="round">
      <path d="${LIFE}" stroke="${s.mark}" stroke-width="${s.w}"/>
      <path d="${HEAD}" stroke="${s.mark}" stroke-width="${s.w}"/>
      <path d="${HEART}" stroke="${s.heart}" stroke-width="${wHeart}"/>
    </svg>
  </div></body></html>`;
}

const ASSETS = [
  // iOS app icon — NEUTRAL paper tile (opaque; iOS icons can't be transparent), ink head/life + a
  // vermilion heart whisper. The mark carries the color; the field stays neutral (v2 §3.1).
  { name: 'icon.png', size: 1024, bg: C.paper, mark: C.ink, heart: C.vermilion, inner: 660, w: 3.4 },
  // Android adaptive foreground — transparent; sits on the #FAF9F7 adaptive bg → ink mark + vermilion heart.
  { name: 'android-icon-foreground.png', size: 1024, bg: 'transparent', mark: C.ink, heart: C.vermilion, inner: 520, w: 3.4 },
  // Android monochrome (themed icons) — single solid silhouette; Android tints it, so it stays black.
  { name: 'android-icon-monochrome.png', size: 1024, bg: 'transparent', mark: '#000000', heart: '#000000', inner: 520, w: 3.6 },
  // Splash mark (light bg #FAF9F7, set in app.json) — ink mark + vermilion heart on transparent.
  { name: 'splash-icon.png', size: 512, bg: 'transparent', mark: C.ink, heart: C.vermilion, inner: 300, w: 3.2 },
  // Splash mark (dark bg #14151A, set in app.json) — light mark + coral heart.
  { name: 'splash-icon-dark.png', size: 512, bg: 'transparent', mark: C.lightMark, heart: C.coral, inner: 300, w: 3.2 },
  // Web favicon — a solid vermilion mini-mark (reads on any tab background).
  { name: 'favicon.png', size: 64, bg: 'transparent', mark: C.vermilion, heart: C.vermilion, inner: 52, w: 3.6 },
];

function shoot(file, out, size, transparent) {
  return new Promise((resolve, reject) => {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${size},${size}`,
      `--screenshot=${out}`,
      '--virtual-time-budget=2000',
    ];
    if (transparent) args.push('--default-background-color=00000000');
    args.push('file://' + file.replace(/\\/g, '/'));
    const p = spawn(CHROME, args);
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', () => resolve());
    p.on('error', reject);
  });
}

await mkdir(TMP, { recursive: true });
await mkdir(OUT, { recursive: true });
for (const a of ASSETS) {
  const htmlFile = path.join(TMP, a.name.replace('.png', '.html'));
  await writeFile(htmlFile, html(a));
  const out = path.join(OUT, a.name);
  await shoot(htmlFile, out, a.size, a.bg === 'transparent');
  console.log(`generated ${a.name} (${a.size}px)`);
}
await rm(TMP, { recursive: true, force: true });
console.log('done');
