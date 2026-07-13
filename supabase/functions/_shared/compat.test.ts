import { assert, assertEquals } from '@std/assert';
import { COMPAT_ALGORITHM_VERSION, scorePair } from './compat.ts';

const palm = (o: Partial<{ hand: string; hd: string; hc: string; hl: string; kd: string; ld: string; fate: string }> = {}) => ({
  hand_shape: o.hand ?? 'water',
  heart_line: { depth: o.hd ?? 'moderate', curvature: o.hc ?? 'gently_curved', length: o.hl ?? 'medium' },
  head_line: { depth: o.kd ?? 'moderate', curvature: 'gently_curved', length: 'medium' },
  life_line: { depth: o.ld ?? 'moderate', curvature: 'gently_curved', length: 'medium' },
  fate_line: { present: o.fate ?? 'clear' },
});

Deno.test('scorePair is deterministic and symmetric', () => {
  const a = palm({ hand: 'fire', hd: 'deep' });
  const b = palm({ hand: 'air', hd: 'faint' });
  const s1 = scorePair(a, b);
  assertEquals(s1, scorePair(a, b), 'same inputs → same score');
  assertEquals(s1.composite, scorePair(b, a).composite, 'symmetric composite');
  assertEquals(s1.sub_scores, scorePair(b, a).sub_scores, 'symmetric sub-scores');
  assertEquals(s1.algorithm_version, COMPAT_ALGORITHM_VERSION);
});

Deno.test('scorePair: all sub-scores and composite are within 0–100', () => {
  const s = scorePair(palm({ hand: 'fire' }), palm({ hand: 'water' }));
  for (const v of [...Object.values(s.sub_scores), s.composite]) {
    assert(v >= 0 && v <= 100 && Number.isInteger(v), `in range: ${v}`);
  }
});

Deno.test('elements: fire+air fuel each other (high); fire+water steam (friction)', () => {
  const fuel = scorePair(palm({ hand: 'fire' }), palm({ hand: 'air' })).sub_scores.elements;
  const steam = scorePair(palm({ hand: 'fire' }), palm({ hand: 'water' })).sub_scores.elements;
  assert(fuel > steam + 20, `fuel ${fuel} >> steam ${steam}`);
  assert(fuel >= 85 && steam <= 60);
});

Deno.test('emotion: matching heart lines resonate higher than opposite ones', () => {
  const match = scorePair(palm({ hd: 'deep', hc: 'strongly_curved' }), palm({ hd: 'deep', hc: 'strongly_curved' })).sub_scores.emotion;
  const opp = scorePair(palm({ hd: 'deep', hc: 'strongly_curved' }), palm({ hd: 'faint', hc: 'straight' })).sub_scores.emotion;
  assert(match > opp, `match ${match} > opposite ${opp}`);
});

Deno.test('destiny: two clear fate lines score above a clear/absent asymmetry', () => {
  const both = scorePair(palm({ fate: 'clear' }), palm({ fate: 'clear' })).sub_scores.destiny;
  const asym = scorePair(palm({ fate: 'clear' }), palm({ fate: 'absent' })).sub_scores.destiny;
  assert(both > asym);
});

Deno.test('missing fields fall back to neutral (no NaN)', () => {
  const s = scorePair({ hand_shape: 'mixed' }, {});
  for (const v of [...Object.values(s.sub_scores), s.composite]) assert(Number.isFinite(v));
});
