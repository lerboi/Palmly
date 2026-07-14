// Renders a sample share card SVG from the server generator (card-svg.ts) into an HTML file so it
// can be screenshotted with headless Chrome — device-free verification for R16b (Deno not installed
// here). Run: node --experimental-strip-types scripts/gen-card.ts
import { writeFileSync } from 'node:fs';
import { buildCardSvg, type Point } from '../../supabase/functions/_shared/card-svg.ts';

// Same geometry as the app fixture (reveal.ts PREVIEW_GEOMETRY) so the card matches the app preview.
const geom: Record<string, Point[]> = {
  heart_line: [
    [120, 300],
    [400, 270],
    [700, 285],
    [880, 305],
  ],
  head_line: [
    [130, 420],
    [450, 445],
    [770, 475],
  ],
  life_line: [
    [185, 360],
    [250, 560],
    [360, 820],
  ],
  fate_line: [
    [520, 905],
    [500, 560],
    [478, 300],
  ],
};

const svg = buildCardSvg({
  variant: 'feed_4x5',
  headline: 'A Water hand — feeling runs deep in you.',
  chips: ['Deep heart line', 'Clear fate line', 'Long head line'],
  lineGeometry: geom,
  signatureLines: ['heart_line', 'fate_line'],
  attribution: 'Mei',
});

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#EEE}
  svg{width:540px;height:auto;display:block}
</style></head><body>${svg}</body></html>`;

writeFileSync(new URL('../card-preview.html', import.meta.url), html);
console.log('wrote app/card-preview.html');
