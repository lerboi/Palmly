/**
 * P8.T1 verify (Deno) — render the share cards for the sample palms in both variants, rasterize to
 * PNG via headless Chrome, assert each PNG is < 450KB (§3.3), and save a contact sheet for the
 * §3.2 screenshot-checklist visual review. The production edge function rasterizes the SAME SVG via
 * resvg-wasm; Chrome (which has fonts, incl. CJK fallback) is the device-free stand-in here.
 *
 *   deno run --allow-read --allow-write --allow-run --allow-env --config supabase/functions/deno.json eval/p8t1.ts
 */
import { buildCardSvg, deriveCardContent, type CardVariant, type Point } from '../supabase/functions/_shared/card-svg.ts';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = new URL('../docs/checkpoints/p8-cards/', import.meta.url);
const SAMPLES = ['palm_01', 'palm_02', 'palm_03'];
const VARIANTS: CardVariant[] = ['feed_4x5', 'story_9x16'];
const DIMS: Record<CardVariant, [number, number]> = { feed_4x5: [1080, 1350], story_9x16: [1080, 1920] };
const MAX_BYTES = 450 * 1024;

await Deno.mkdir(OUT, { recursive: true });
let ok = true;
const fail = (m: string) => {
  console.log('FAIL', m);
  ok = false;
};

const cards: { name: string; png: string; bytes: number }[] = [];

for (const s of SAMPLES) {
  const features = JSON.parse(await Deno.readTextFile(new URL(`../eval/samples/narrative/${s}.json`, import.meta.url)));
  const content = deriveCardContent(features);
  for (const variant of VARIANTS) {
    const name = `${s}_${variant}`;
    const svg = buildCardSvg({
      variant,
      headline: content.headline,
      chips: content.chips,
      signatureLines: content.signatureLines,
      lineGeometry: (features.line_geometry ?? {}) as Record<string, Point[]>,
      attribution: s === 'palm_01' ? 'Mei' : undefined,
    });
    const svgPath = new URL(`${name}.svg`, OUT);
    await Deno.writeTextFile(svgPath, svg);
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}</style></head><body>${svg}</body></html>`;
    const htmlPath = new URL(`${name}.html`, OUT);
    await Deno.writeTextFile(htmlPath, html);

    const [w, h] = DIMS[variant];
    const pngPath = new URL(`${name}.png`, OUT);
    const cmd = new Deno.Command(CHROME, {
      args: [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        `--window-size=${w},${h}`,
        `--screenshot=${pngPath.pathname.replace(/^\//, '')}`,
        htmlPath.pathname.replace(/^\//, ''),
      ],
      stdout: 'null',
      stderr: 'null',
    });
    await cmd.output();
    await Deno.remove(htmlPath).catch(() => {}); // throwaway Chrome wrapper

    let bytes = 0;
    try {
      bytes = (await Deno.stat(pngPath)).size;
    } catch {
      fail(`${name}: no PNG produced (Chrome render failed)`);
      continue;
    }
    if (bytes === 0) fail(`${name}: empty PNG`);
    else if (bytes > MAX_BYTES) fail(`${name}: ${(bytes / 1024).toFixed(0)}KB exceeds 450KB`);
    else console.log(`OK   ${name}: ${(bytes / 1024).toFixed(0)}KB`);
    cards.push({ name, png: `${name}.png`, bytes });
  }
}

// contact sheet for the visual §3.2 checklist review
const sheet = `<!doctype html><html><head><meta charset="utf-8"><title>P8.T1 share cards</title>
<style>body{background:#2a2622;color:#eee;font-family:sans-serif;padding:24px}h1{font-weight:400}
.grid{display:flex;flex-wrap:wrap;gap:20px}figure{margin:0}img{width:300px;border:1px solid #555;background:#fff}
figcaption{font-size:13px;margin-top:6px;color:#bbb}</style></head><body>
<h1>P8.T1 — solo-palm share cards (§3.2 checklist: headline · diagram · chips · seal+domain readable in &lt;2s)</h1>
<div class="grid">${cards.map((c) => `<figure><img src="${c.png}"><figcaption>${c.name} — ${(c.bytes / 1024).toFixed(0)}KB</figcaption></figure>`).join('')}</div>
</body></html>`;
await Deno.writeTextFile(new URL('index.html', OUT), sheet);

console.log(`\n${cards.length} cards rendered → docs/checkpoints/p8-cards/index.html`);
console.log(ok ? 'P8T1_OK' : 'P8T1_FAIL');
Deno.exit(ok ? 0 : 1);
