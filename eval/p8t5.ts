/**
 * P8.T5 verify (Deno) — the compatibility scorer's distribution over 500 synthetic random palm
 * pairs must right-skew warm (most 55–85, rare-but-real lows), per Backend §7. Seeded PRNG →
 * reproducible. Also re-checks determinism. Run:
 *   deno run --config supabase/functions/deno.json eval/p8t5.ts
 */
import { scorePair } from '../supabase/functions/_shared/compat.ts';

// deterministic PRNG (mulberry32) so the distribution assertion is reproducible run-to-run
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260713);
const pick = <T>(xs: T[]): T => xs[Math.floor(rng() * xs.length)];

const HAND = ['earth', 'water', 'fire', 'air', 'mixed'];
const DEPTH = ['faint', 'moderate', 'deep'];
const CURVE = ['straight', 'gently_curved', 'strongly_curved'];
const LEN = ['short', 'medium', 'long'];
const FATE = ['absent', 'faint', 'clear'];
const line = () => ({ depth: pick(DEPTH), curvature: pick(CURVE), length: pick(LEN) });
const randPalm = () => ({ hand_shape: pick(HAND), heart_line: line(), head_line: line(), life_line: line(), fate_line: { present: pick(FATE) } });

let ok = true;
const fail = (m: string) => {
  console.log('FAIL', m);
  ok = false;
};

const N = 500;
const comps: number[] = [];
for (let i = 0; i < N; i++) {
  const a = randPalm();
  const b = randPalm();
  const s = scorePair(a, b);
  if (scorePair(a, b).composite !== s.composite) fail('non-deterministic');
  if (scorePair(b, a).composite !== s.composite) fail('asymmetric');
  comps.push(s.composite);
}

comps.sort((x, y) => x - y);
const mean = comps.reduce((s, x) => s + x, 0) / N;
const pct = (lo: number, hi: number) => (comps.filter((x) => x >= lo && x <= hi).length / N) * 100;
const inBand = pct(55, 85);
const min = comps[0];
const max = comps[N - 1];
const p10 = comps[Math.floor(N * 0.1)];

console.log(`n=${N} mean=${mean.toFixed(1)} min=${min} p10=${p10} max=${max}`);
console.log(`in [55,85] = ${inBand.toFixed(1)}%   below 55 = ${pct(0, 54).toFixed(1)}%   above 85 = ${pct(86, 100).toFixed(1)}%`);
// histogram
const buckets: Record<number, number> = {};
for (const x of comps) {
  const bkt = Math.floor(x / 5) * 5;
  buckets[bkt] = (buckets[bkt] ?? 0) + 1;
}
for (const bkt of Object.keys(buckets).map(Number).sort((a, b) => a - b)) {
  console.log(`  ${bkt}-${bkt + 4}: ${'█'.repeat(Math.round(buckets[bkt] / 3))} ${buckets[bkt]}`);
}

// acceptance: warm right-skew — mean in the band's upper half, the clear majority inside 55–85,
// and rare-but-real lows present (min noticeably below the band).
if (mean < 62 || mean > 80) fail(`mean ${mean.toFixed(1)} not in [62,80] (warm skew)`);
if (inBand < 70) fail(`only ${inBand.toFixed(1)}% in [55,85] (want ≥70%)`);
if (min > 55) fail(`no rare lows (min ${min} should dip below 55 for shareable variance)`);

console.log(ok ? 'P8T5_OK' : 'P8T5_FAIL');
Deno.exit(ok ? 0 : 1);
