import { assert, assertEquals, assertStringIncludes } from '@std/assert';
import { buildCardSvg, deriveCardContent, type Point } from './card-svg.ts';
import palm01 from '../../../eval/samples/narrative/palm_01.json' with { type: 'json' };
import palm02 from '../../../eval/samples/narrative/palm_02.json' with { type: 'json' };

const geom = (palm01 as unknown as { line_geometry: Record<string, Point[]> }).line_geometry;

Deno.test('buildCardSvg: feed variant has the right dimensions and core elements', () => {
  const svg = buildCardSvg({ variant: 'feed_4x5', headline: 'A Water hand — feeling runs deep.', chips: ['Deep heart line', 'Clear fate line'], lineGeometry: geom, attribution: 'Mei' });
  assertStringIncludes(svg, 'width="1080" height="1350"');
  assertStringIncludes(svg, 'Water hand'); // headline (may be wrapped across tspans)
  assertStringIncludes(svg, 'feeling'); // headline word
  assertStringIncludes(svg, 'palmly.app'); // brand
  assertStringIncludes(svg, 'Mei'); // attribution
  assertStringIncludes(svg, 'Deep heart line'); // chip
  assertStringIncludes(svg, '#C2554A'); // CJK-free heritage logomark stamp (the corner seal)
  assert(!/[一-鿿]/.test(svg), 'no CJK anywhere in the redesigned card'); // §2/§7
  assert((svg.match(/<path /g) ?? []).length >= 6, 'engraved strokes rendered (underlay + main per line)');
});

Deno.test('buildCardSvg: signature lines are drawn in the accent; others in ink', () => {
  const withFate: Record<string, Point[]> = { ...geom, fate_line: [[500, 880], [520, 360]] };
  const svg = buildCardSvg({ variant: 'feed_4x5', headline: 'x', chips: ['y'], lineGeometry: withFate, signatureLines: ['heart_line', 'fate_line'] });
  assertStringIncludes(svg, '#4B57C4'); // twilight-indigo accent present (signature strokes)
  assertStringIncludes(svg, 'Heart'); // heart label (English)
  assertStringIncludes(svg, 'Fate'); // fate label (English)
  // an accent signature stroke uses width 6; a non-signature (ink) stroke uses 4.5
  assertStringIncludes(svg, 'stroke="#4B57C4" stroke-width="6"');
  assertStringIncludes(svg, `stroke="#1A1A1F" stroke-width="4.5"`);
});

Deno.test('buildCardSvg: story variant is 9:16 and adds the QR block', () => {
  const feed = buildCardSvg({ variant: 'feed_4x5', headline: 'x', chips: ['y'], lineGeometry: geom });
  const story = buildCardSvg({ variant: 'story_9x16', headline: 'x', chips: ['y'], lineGeometry: geom });
  assertStringIncludes(story, 'width="1080" height="1920"');
  assertStringIncludes(story, 'scan to compare'); // QR only on story
  assert(!feed.includes('scan to compare'), 'no QR on feed');
});

Deno.test('buildCardSvg: never emits more than 3 chips (anti-clutter §3.2)', () => {
  const svg = buildCardSvg({ variant: 'feed_4x5', headline: 'x', chips: ['a', 'b', 'c', 'd', 'e'], lineGeometry: geom });
  // each chip is one <rect rx="30" ... height="60"> — count them
  assertEquals((svg.match(/rx="30" ry="30"/g) ?? []).length, 3);
});

Deno.test('buildCardSvg: escapes user-influenced text', () => {
  const svg = buildCardSvg({ variant: 'feed_4x5', headline: 'a <b> & "c"', chips: ['<x>'], lineGeometry: geom });
  assert(!svg.includes('<b>'));
  assertStringIncludes(svg, '&lt;b&gt;');
});

Deno.test('deriveCardContent: rich palm → element headline + notable chips + 2 signature lines', () => {
  const c = deriveCardContent(palm01 as Record<string, unknown>);
  assertStringIncludes(c.headline, 'Water hand');
  assert(c.chips.includes('Deep heart line'));
  assert(c.chips.includes('Clear fate line'));
  assert(c.chips.length <= 3 && c.chips.length >= 1);
  assertEquals(c.signatureLines[0], 'heart_line');
  assertEquals(c.signatureLines[1], 'fate_line'); // fate is clear → the cinnabar second line
});

Deno.test('deriveCardContent: sparse palm still yields a headline + at least one chip', () => {
  const c = deriveCardContent(palm02 as Record<string, unknown>); // earth hand, faint lines, no fate
  assertStringIncludes(c.headline, 'Earth hand');
  assert(c.chips.length >= 1);
  assertEquals(c.signatureLines.length, 2);
});
