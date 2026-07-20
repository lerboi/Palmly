import { assert, assertEquals, assertStringIncludes } from '@std/assert';
import { buildCardSvg, buildCompatCardSvg, buildFortuneCardSvg, deriveCardContent, deriveCompatCardContent, deriveFortuneCardContent, type Point } from './card-svg.ts';
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
  assertStringIncludes(svg, '#FAF9F7'); // warm-paper field (matches the app preview, V21)
  assertStringIncludes(svg, '#FBE7E2'); // tonal accentMuted trait chip (branded pill, V21)
  assertStringIncludes(svg, 'rx="10" fill="#9E3B2E"'); // FILLED claret heritage chop-seal (name-chop, F2.T1 §5.4 #2)
  assert(!svg.includes('#4B57C4'), 'retired indigo accent appears nowhere'); // §3/§8
  assert(!/[一-鿿]/.test(svg), 'no CJK anywhere in the redesigned card'); // §2/§7
  assert((svg.match(/<path /g) ?? []).length >= 6, 'engraved strokes rendered (underlay + main per line)');
});

Deno.test('buildCardSvg: signature lines are drawn in the accent; others in ink', () => {
  const withFate: Record<string, Point[]> = { ...geom, fate_line: [[500, 880], [520, 360]] };
  const svg = buildCardSvg({ variant: 'feed_4x5', headline: 'x', chips: ['y'], lineGeometry: withFate, signatureLines: ['heart_line', 'fate_line'] });
  assertStringIncludes(svg, '#D13B27'); // vermilion accent present (signature strokes, §3.2)
  assertStringIncludes(svg, 'Heart'); // heart label (English)
  assertStringIncludes(svg, 'Fate'); // fate label (English)
  // an accent signature stroke uses width 6; a non-signature (ink) stroke uses 4.5
  assertStringIncludes(svg, 'stroke="#D13B27" stroke-width="6"');
  assertStringIncludes(svg, `stroke="#1A1A1F" stroke-width="4.5"`);
});

Deno.test('buildCardSvg: story variant is 9:16 and ships NO fake QR (D3-06)', () => {
  const feed = buildCardSvg({ variant: 'feed_4x5', headline: 'x', chips: ['y'], lineGeometry: geom });
  const story = buildCardSvg({ variant: 'story_9x16', headline: 'x', chips: ['y'], lineGeometry: geom });
  assertStringIncludes(story, 'width="1080" height="1920"'); // 9:16 dimensions
  // The old non-scannable "scan to compare" placeholder was removed (a real QR needs the per-share
  // invite URL, added at share time, not the pre-rendered draft). Neither variant may imply a fake code.
  assert(!story.includes('scan to compare'), 'no fake QR on story');
  assert(!feed.includes('scan to compare'), 'no fake QR on feed');
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

Deno.test('buildCardSvg: the sender byline is omitted without attribution (F1.T9 anonymous draft)', () => {
  const named = buildCardSvg({ variant: 'feed_4x5', headline: 'x', chips: ['y'], lineGeometry: geom, attribution: 'Zara' });
  const anon = buildCardSvg({ variant: 'feed_4x5', headline: 'x', chips: ['y'], lineGeometry: geom });
  assertStringIncludes(named, '>Zara</text>'); // the consent-gated byline
  assert(!anon.includes('Zara'), 'the anonymous (show-my-name-off) draft carries no sender byline');
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

// ── Compatibility card class (audit F1.T9) ──
Deno.test('buildCompatCardSvg: two names, claret heart-thread, a score ring, chips', () => {
  const svg = buildCompatCardSvg({ variant: 'feed_4x5', headline: 'A rare, easy resonance', score: 82, nameA: 'You', nameB: 'Mei', geometryA: geom, geometryB: geom, chips: ['Emotion in tune', 'Mind to bridge'] });
  assertStringIncludes(svg, 'width="1080" height="1350"');
  assertStringIncludes(svg, '>You</text>');
  assertStringIncludes(svg, '>Mei</text>');
  assertStringIncludes(svg, '>82</text>'); // real score in the ring
  assertStringIncludes(svg, '#9E3B2E'); // claret thread + seal (heritage, §3.2)
  assertStringIncludes(svg, 'Emotion in tune'); // shared-trait chip
  assertStringIncludes(svg, 'palmly.app');
  assert(!/[一-鿿]/.test(svg), 'no CJK on the compat card');
  assert(!svg.includes('#4B57C4'), 'no retired indigo accent');
});

Deno.test('buildCompatCardSvg: pre-claim shows a "?" ring, never a fabricated score', () => {
  const svg = buildCompatCardSvg({ variant: 'feed_4x5', headline: 'x', score: null, nameA: 'You', nameB: 'Sam', geometryA: geom, geometryB: geom, chips: [] });
  assertStringIncludes(svg, '>?</text>');
});

Deno.test('buildCompatCardSvg: caps chips at 2 (shared + friction)', () => {
  const svg = buildCompatCardSvg({ variant: 'feed_4x5', headline: 'x', score: 70, nameA: 'A', nameB: 'B', geometryA: geom, geometryB: geom, chips: ['one', 'two', 'three'] });
  assertEquals((svg.match(/rx="30" ry="30"/g) ?? []).length, 2);
});

Deno.test('deriveCompatCardContent: shared-trait (top sub) + friction (low sub), honest', () => {
  const c = deriveCompatCardContent({ score: 82, sub_scores: { emotion: 90, mind: 55, life_energy: 70 }, narrative: { headline: 'Deeply in sync' } });
  assertEquals(c.headline, 'Deeply in sync');
  assert(c.chips.includes('Emotion in tune')); // highest sub-score
  assert(c.chips.includes('Mind to bridge')); // lowest sub-score
  assert(c.chips.length <= 2);
});

// ── Daily-fortune card class (audit F1.T9) ──
Deno.test('buildFortuneCardSvg: date eyebrow, essence headline, lucky triad, do-chips', () => {
  const svg = buildFortuneCardSvg({ variant: 'feed_4x5', headline: 'A steady day to plant seeds and mend fences.', dateLabel: "Today's Almanac · July 20", luckyDirection: 'Southeast', luckyColor: 'Vermilion', luckyHours: '7–9am', chips: ['Sign paperwork', 'Reach out first'] });
  assertStringIncludes(svg, 'width="1080" height="1350"');
  assertStringIncludes(svg, "TODAY'S ALMANAC · JULY 20"); // eyebrow (upper-cased)
  assertStringIncludes(svg, 'plant'); // headline word (the headline wraps across tspans)
  assertStringIncludes(svg, '>Direction</text>');
  assertStringIncludes(svg, '>Southeast</text>');
  assertStringIncludes(svg, '>Vermilion</text>');
  assertStringIncludes(svg, 'Sign paperwork'); // do-chip
  assertStringIncludes(svg, 'palmly.app');
  assertStringIncludes(svg, '#9E3B2E'); // claret seal
  assert(!/[一-鿿]/.test(svg), 'no CJK on the fortune card');
});

Deno.test('buildFortuneCardSvg: omits absent triad values (no invented almanac data)', () => {
  const svg = buildFortuneCardSvg({ variant: 'feed_4x5', headline: 'x', dateLabel: 'Today', luckyDirection: 'North', chips: [] });
  assertStringIncludes(svg, '>North</text>');
  assert(!svg.includes('>Lucky color</text>'), 'no color tile when absent');
  assert(!svg.includes('>Lucky hours</text>'), 'no hours tile when absent');
});

Deno.test('deriveFortuneCardContent: essence headline + do-hooks + lucky triad from content jsonb', () => {
  const c = deriveFortuneCardContent({ overall: 'A calm, favorable day.', do: ['Rest', 'Plan ahead', 'Call family', 'Ignore this fourth'], dont: ['Overspend'], lucky_direction: 'East', lucky_color: 'Jade', lucky_hours: '5–7pm' });
  assertEquals(c.headline, 'A calm, favorable day.');
  assertEquals(c.chips.length, 3); // capped at 3
  assert(c.chips.includes('Rest'));
  assertEquals(c.luckyDirection, 'East');
  assertEquals(c.luckyColor, 'Jade');
});

Deno.test('card SVG source stays tiny (guards a runaway toward the 450KB PNG budget)', () => {
  const solo = buildCardSvg({ variant: 'story_9x16', headline: 'A Water hand — feeling runs deep and true', chips: ['Deep heart line', 'Clear fate line', 'Long head line'], lineGeometry: geom, attribution: 'Mei' });
  const compat = buildCompatCardSvg({ variant: 'story_9x16', headline: 'A rare, easy resonance', score: 82, nameA: 'You', nameB: 'Mei', geometryA: geom, geometryB: geom, chips: ['Emotion in tune', 'Mind to bridge'] });
  // The SVG is a small fraction of the rasterized PNG; a runaway (embedded data / duplicated defs) is
  // the failure this guards. The real <450KB PNG assertion lives in the resvg render test (D2.T1 cont).
  assert(solo.length < 60_000, `solo SVG ${solo.length} bytes`);
  assert(compat.length < 60_000, `compat SVG ${compat.length} bytes`);
});
