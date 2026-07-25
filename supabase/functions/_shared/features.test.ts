import { assertEquals, assert } from '@std/assert';
import { canonicalize, featureHash, deriveGeometry, geometryDistance } from './features.ts';

const base = {
  is_hand: true,
  hand_shape: 'water',
  heart_line: { length: 'long', depth: 'deep', curvature: 'gently_curved', ending: 'between_index_middle', breaks: 'none', islands: 'none', chains: 'none', confidence: 'high' },
  line_geometry: { heart_line: [[100, 300], [400, 320], [700, 330]], head_line: [[110, 470], [430, 480]], life_line: [[250, 380], [300, 760]] },
};

Deno.test('canonicalize sorts keys so order does not matter', () => {
  assertEquals(canonicalize({ b: 1, a: 2 }), canonicalize({ a: 2, b: 1 }));
});

Deno.test('featureHash is deterministic and ignores line_geometry', async () => {
  const h1 = await featureHash(base);
  const h2 = await featureHash({ ...base, line_geometry: { heart_line: [[0, 0], [1, 1]] } }); // different geometry
  assertEquals(h1, h2, 'same buckets → same hash regardless of geometry');
  const h3 = await featureHash({ ...base, hand_shape: 'fire' }); // different bucket
  assert(h1 !== h3, 'different buckets → different hash');
  assert(/^[0-9a-f]{64}$/.test(h1), 'sha256 hex');
});

Deno.test('deriveGeometry produces scale-invariant 0-1 signatures', () => {
  const g = deriveGeometry(base);
  assert(g.heart && g.head && g.life, 'lines present');
  assertEquals(g.heart!.start, [0.1, 0.3]);
  assert(g.heart!.length > 0 && g.heart!.length < 1);
  assertEquals(g.fate, null, 'absent line → null');
});

Deno.test('geometryDistance is 0 for identical, larger for different', () => {
  const g = deriveGeometry(base);
  assertEquals(geometryDistance(g, g), 0);
  const moved = deriveGeometry({ ...base, line_geometry: { ...base.line_geometry, heart_line: [[900, 900], [950, 950]] } });
  assert(geometryDistance(g, moved) > 0);
});

// ── hand signature (2026-07-25 — the primary identity matcher after the live line-match failure) ──

Deno.test('parseHandSignature: accepts a sane client signature, rejects junk', async () => {
  const { parseHandSignature } = await import('./features.ts');
  const good = { fingers: [0.42, 0.48, 0.45, 0.36], palm_width: 0.38 };
  assertEquals(parseHandSignature(good), good);
  for (const bad of [
    null,
    'x',
    42,
    { fingers: [0.4, 0.5, 0.4], palm_width: 0.3 }, // 3 fingers
    { fingers: [0.4, 0.5, 0.4, Infinity], palm_width: 0.3 },
    { fingers: [0.4, 0.5, 0.4, -0.1], palm_width: 0.3 }, // negative
    { fingers: [0.4, 0.5, 0.4, 0.4], palm_width: 0 }, // zero width
    { fingers: [0.4, 0.5, 0.4, 0.4], palm_width: 99 }, // absurd scale
    { fingers: '0.4', palm_width: 0.3 },
  ]) {
    assertEquals(parseHandSignature(bad), null, `must reject ${JSON.stringify(bad)}`);
  }
});

Deno.test('handDistance: 0 for identical shapes, small for jitter, large for a different hand', async () => {
  const { handDistance } = await import('./features.ts');
  const me = { fingers: [0.42, 0.48, 0.45, 0.36], palm_width: 0.38 };
  assertEquals(handDistance(me, me), 0);
  const jitter = { fingers: [0.425, 0.478, 0.452, 0.361], palm_width: 0.383 };
  assert(handDistance(me, jitter) < 0.01, 'repeat-scan jitter stays well under threshold scale');
  const other = { fingers: [0.48, 0.55, 0.51, 0.42], palm_width: 0.34 };
  assert(handDistance(me, other) > 0.04, 'a different hand reads clearly apart');
});
