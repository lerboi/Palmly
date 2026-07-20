// Rasterized-PNG budget guard (audit F1.T9). The pure SVG generators are unit-tested in
// _shared/card-svg.test.ts (with a cheap SVG-length proxy); THIS test does the real thing — it runs
// each card SVG through resvg (the same `renderCardPng` the function uses) and asserts the PNG stays
// under the 450KB share budget (UIUX §3). It lives beside render.ts (not in _shared) because it pulls
// in the resvg-wasm dependency; it needs --allow-read for the vendored wasm + font assets.
import { assert } from '@std/assert';
import { renderCardPng } from './render.ts';
import { buildCardSvg, buildCompatCardSvg, buildFortuneCardSvg, deriveCardContent, type Point } from '../_shared/card-svg.ts';
import palm01 from '../../../eval/samples/narrative/palm_01.json' with { type: 'json' };

const geom = (palm01 as unknown as { line_geometry: Record<string, Point[]> }).line_geometry;
const BUDGET = 450_000; // the share-card PNG budget (UIUX §3); our cards are ~75KB, so this guards a runaway.

async function pngSize(svg: string): Promise<number> {
  const png = await renderCardPng(svg);
  // PNG magic — proves it actually rasterized (not an empty buffer from a missing wasm/font).
  assert(png.length > 1000 && png[0] === 0x89 && png[1] === 0x50 && png[2] === 0x4e && png[3] === 0x47, 'a valid, non-empty PNG');
  return png.length;
}

Deno.test('rasterized card PNGs stay under the 450KB share budget (all classes, both variants)', async () => {
  const solo = deriveCardContent(palm01 as Record<string, unknown>);
  const cases: [string, string][] = [
    ['solo feed', buildCardSvg({ variant: 'feed_4x5', headline: solo.headline, chips: solo.chips, signatureLines: solo.signatureLines, lineGeometry: geom, attribution: 'Mei' })],
    ['solo story', buildCardSvg({ variant: 'story_9x16', headline: solo.headline, chips: solo.chips, signatureLines: solo.signatureLines, lineGeometry: geom, attribution: 'Mei' })],
    ['compat feed', buildCompatCardSvg({ variant: 'feed_4x5', headline: 'A rare, easy resonance', score: 82, nameA: 'You', nameB: 'Mei', geometryA: geom, geometryB: geom, chips: ['Emotion in tune', 'Mind to bridge'] })],
    ['compat story', buildCompatCardSvg({ variant: 'story_9x16', headline: 'A rare, easy resonance', score: 82, nameA: 'You', nameB: 'Mei', geometryA: geom, geometryB: geom, chips: ['Emotion in tune', 'Mind to bridge'] })],
    ['fortune feed', buildFortuneCardSvg({ variant: 'feed_4x5', headline: 'A steady day to plant seeds and mend fences.', dateLabel: 'Daily Almanac · July 21', luckyDirection: 'Southeast', luckyColor: 'Vermilion', luckyHours: '7–9am', chips: ['Sign paperwork', 'Reach out first'] })],
  ];
  for (const [name, svg] of cases) {
    const size = await pngSize(svg);
    assert(size < BUDGET, `${name} PNG ${size} bytes exceeds the ${BUDGET}-byte budget`);
  }
});
