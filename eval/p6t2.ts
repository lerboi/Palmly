// P6.T2 verify (Deno, device-free) — render the palm line-diagram for the sample palms via the SAME
// pure `buildDiagram` the RN component uses, rasterize each to PNG via headless Chrome, and save a
// contact sheet. Proves the renderer draws `line_geometry` as an engraved ink diagram with the
// per-line cinnabar highlight (the reveal hero + section highlights). "Recognizably matches the
// source photo" needs REAL captured palms (device/H4c) — the synthetic samples verify the rendering.
//
//   deno run --allow-read --allow-write --allow-run --config supabase/functions/deno.json eval/p6t2.ts
import { buildDiagram, type LineGeometry } from '../app/src/components/palm-diagram/geometry.ts';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = new URL('../docs/checkpoints/p6-diagrams/', import.meta.url);
const SAMPLES = ['palm_01', 'palm_02', 'palm_03'];
const SIZE = 600;
const PALETTE = { paper: '#F7F2E7', ink: '#2B2620', inkWash: '#8A7F6D', cinnabar: '#C3272B' };

await Deno.mkdir(OUT, { recursive: true });
let ok = true;

function diagramSvg(geometry: LineGeometry, opts: { highlightedLine?: string; signatureLines?: string[] }): string {
  const strokes = buildDiagram(geometry, { size: SIZE, ...opts });
  const uw = (14 * SIZE) / 1000; // engraved underlay width
  const parts: string[] = [`<rect width="${SIZE}" height="${SIZE}" fill="${PALETTE.paper}"/>`];
  for (const s of strokes) {
    parts.push(`<path d="${s.d}" fill="none" stroke="${PALETTE.ink}" stroke-opacity="0.10" stroke-width="${uw}" stroke-linecap="round" stroke-linejoin="round"/>`);
    const w = ((s.highlighted ? 6 : 4.5) * SIZE) / 1000;
    parts.push(`<path d="${s.d}" fill="none" stroke="${s.highlighted ? PALETTE.cinnabar : PALETTE.ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  for (const s of strokes) {
    if (s.label) parts.push(`<text x="${s.label.x}" y="${s.label.y}" font-family="Noto Serif SC, Noto Serif TC, serif" font-size="${(34 * SIZE) / 1000}" fill="${PALETTE.inkWash}">${s.label.text}</text>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${parts.join('')}</svg>`;
}

const shots: { name: string; png: string; caption: string; strokes: number }[] = [];
for (const s of SAMPLES) {
  const features = JSON.parse(await Deno.readTextFile(new URL(`./samples/narrative/${s}.json`, import.meta.url)));
  const geometry = (features.line_geometry ?? {}) as LineGeometry;
  const strokeCount = buildDiagram(geometry, { size: SIZE }).length;
  if (strokeCount < 1) {
    console.log(`FAIL ${s}: no line_geometry strokes`);
    ok = false;
    continue;
  }
  const modes: { suffix: string; caption: string; opts: { highlightedLine?: string; signatureLines?: string[] } }[] = [
    { suffix: 'hero', caption: 'hero (心 + 运 cinnabar)', opts: { signatureLines: ['heart_line', 'fate_line'] } },
    { suffix: 'head', caption: 'section: 智 head highlighted', opts: { highlightedLine: 'head_line' } },
  ];
  for (const m of modes) {
    const name = `${s}_${m.suffix}`;
    const svg = diagramSvg(geometry, m.opts);
    const htmlPath = new URL(`${name}.html`, OUT);
    await Deno.writeTextFile(htmlPath, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}</style></head><body>${svg}</body></html>`);
    const pngPath = new URL(`${name}.png`, OUT);
    await new Deno.Command(CHROME, {
      args: ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${SIZE},${SIZE}`, `--screenshot=${pngPath.pathname.replace(/^\//, '')}`, htmlPath.pathname.replace(/^\//, '')],
      stdout: 'null',
      stderr: 'null',
    }).output();
    await Deno.remove(htmlPath).catch(() => {});
    let bytes = 0;
    try {
      bytes = (await Deno.stat(pngPath)).size;
    } catch {
      console.log(`FAIL ${name}: no PNG`);
      ok = false;
      continue;
    }
    if (bytes === 0) {
      console.log(`FAIL ${name}: empty PNG`);
      ok = false;
    } else console.log(`OK   ${name}: ${strokeCount} strokes, ${(bytes / 1024).toFixed(0)}KB`);
    shots.push({ name, png: `${name}.png`, caption: `${s} — ${m.caption}`, strokes: strokeCount });
  }
}

const sheet = `<!doctype html><html><head><meta charset="utf-8"><title>P6.T2 palm diagrams</title>
<style>body{background:#2a2622;color:#eee;font-family:sans-serif;padding:24px}h1{font-weight:400;font-size:18px}
.grid{display:flex;flex-wrap:wrap;gap:20px}figure{margin:0}img{width:260px;border:1px solid #555;background:#fff}
figcaption{font-size:13px;margin-top:6px;color:#bbb}</style></head><body>
<h1>P6.T2 — palm line-diagram renderer (engraved ink · per-line cinnabar highlight · 心智命运 labels)</h1>
<div class="grid">${shots.map((c) => `<figure><img src="${c.png}"><figcaption>${c.caption}</figcaption></figure>`).join('')}</div>
</body></html>`;
await Deno.writeTextFile(new URL('index.html', OUT), sheet);
console.log(`\n${shots.length} diagrams → docs/checkpoints/p6-diagrams/index.html`);
console.log(ok ? 'P6T2_OK' : 'P6T2_FAIL');
Deno.exit(ok ? 0 : 1);
