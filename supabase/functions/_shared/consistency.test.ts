import { assert, assertEquals } from '@std/assert';
import { fieldMajority, matchSubject, twoVoteExtract, MATCH_THRESHOLD, type SubjectCandidate } from './consistency.ts';
import type { Geometry } from './features.ts';
import type { ExtractResult } from './extraction.ts';

const geo = (dx = 0): Geometry => ({
  heart: { length: 0.6 + dx, start: [0.1 + dx, 0.3], end: [0.8, 0.35], centroid: [0.45, 0.32] },
  head: { length: 0.5, start: [0.11, 0.47], end: [0.7, 0.5], centroid: [0.4, 0.48] },
  life: { length: 0.55, start: [0.25, 0.38], end: [0.38, 0.88], centroid: [0.3, 0.6] },
  fate: null,
});

Deno.test('matchSubject: same hand matches, a different hand does not', () => {
  const candidates: SubjectCandidate[] = [{ subjectId: 's1', canonicalFeatureSetId: 'f1', geometry: geo(0) }];
  assert(matchSubject(geo(0.01), candidates) !== null, 'near geometry within threshold matches');
  assertEquals(matchSubject(geo(0.01), candidates)!.subject.subjectId, 's1');
  assert(matchSubject(geo(0.5), candidates) === null, 'far geometry is a new subject');
  assert(MATCH_THRESHOLD > 0);
});

const line = (depth: string, confidence = 'high') => ({
  length: 'long', depth, curvature: 'straight', ending: 'other', breaks: 'none', islands: 'none', chains: 'none', confidence,
});
const feat = (depth: string, shape = 'water') => ({ hand_shape: shape, heart_line: line(depth), line_geometry: { heart_line: [[1, 1]] } });

Deno.test('fieldMajority: agreement kept; 2-vote disagreement lowers confidence', () => {
  assertEquals((fieldMajority([feat('deep'), feat('deep')]).heart_line as any).depth, 'deep');
  const merged = fieldMajority([feat('deep'), feat('faint')]).heart_line as any;
  assertEquals(merged.confidence, 'low', 'disagreement lowers the line confidence');
});

Deno.test('fieldMajority: 3-vote majority wins the field', () => {
  const merged = fieldMajority([feat('deep'), feat('deep'), feat('faint')]).heart_line as any;
  assertEquals(merged.depth, 'deep');
});

const ok = (f: Record<string, unknown>): ExtractResult => ({ ok: true, features: f, featureHash: 'h', geometry: geo(), usage: {} });

Deno.test('twoVoteExtract: agreeing runs stop at 2 votes', async () => {
  let n = 0;
  const r = await twoVoteExtract(() => { n++; return Promise.resolve(ok(feat('deep'))); });
  assert(r.ok && r.result.agreed && r.result.votes === 2);
  assertEquals(n, 2, 'no tie-break needed');
});

Deno.test('twoVoteExtract: disagreement triggers a 3rd tie-break with majority', async () => {
  const seq = [feat('deep'), feat('faint'), feat('deep')];
  let n = 0;
  const r = await twoVoteExtract(() => Promise.resolve(ok(seq[n++])));
  assert(r.ok && !r.result.agreed && r.result.votes === 3);
  assertEquals((r.result.features.heart_line as any).depth, 'deep', 'majority wins');
});

Deno.test('twoVoteExtract: an extraction failure fails fast', async () => {
  const r = await twoVoteExtract(() => Promise.resolve({ ok: false, failureReason: 'not_a_hand' }));
  assert(!r.ok && r.failureReason === 'not_a_hand');
});

// ── hand-signature matching (2026-07-25): the pre-extraction fast path ───────────────────────────

Deno.test('matchSubjectByHand: same hand matches, different hand / missing signatures do not', async () => {
  const { matchSubjectByHand, HAND_MATCH_THRESHOLD } = await import('./consistency.ts');
  const hand = { fingers: [0.42, 0.48, 0.45, 0.36], palm_width: 0.38 };
  const withHand: SubjectCandidate[] = [{ subjectId: 's1', canonicalFeatureSetId: 'f1', geometry: { ...geo(0), hand } }];

  // repeat scan of the same hand: tiny MediaPipe jitter → match
  const rescan = { fingers: [0.424, 0.479, 0.447, 0.362], palm_width: 0.377 };
  const m = matchSubjectByHand(rescan, withHand);
  assert(m !== null && m.subject.subjectId === 's1');
  assert(m!.distance < HAND_MATCH_THRESHOLD);

  // someone else's hand: proportions differ → no match
  const other = { fingers: [0.48, 0.55, 0.51, 0.42], palm_width: 0.34 };
  assertEquals(matchSubjectByHand(other, withHand), null);

  // no incoming signature (legacy/web scan) → no match, no crash
  assertEquals(matchSubjectByHand(null, withHand), null);

  // stored canonical predates hand signatures → skipped, no crash
  const legacy: SubjectCandidate[] = [{ subjectId: 's2', canonicalFeatureSetId: 'f2', geometry: geo(0) }];
  assertEquals(matchSubjectByHand(rescan, legacy), null);
});

Deno.test('matchSubjectByHand: picks the closest of several candidates', async () => {
  const { matchSubjectByHand } = await import('./consistency.ts');
  const sig = { fingers: [0.42, 0.48, 0.45, 0.36], palm_width: 0.38 };
  const near = { fingers: [0.421, 0.481, 0.449, 0.361], palm_width: 0.379 };
  const nearish = { fingers: [0.43, 0.49, 0.46, 0.37], palm_width: 0.39 };
  const candidates: SubjectCandidate[] = [
    { subjectId: 'far-ish', canonicalFeatureSetId: 'f1', geometry: { ...geo(0), hand: nearish } },
    { subjectId: 'nearest', canonicalFeatureSetId: 'f2', geometry: { ...geo(0), hand: near } },
  ];
  assertEquals(matchSubjectByHand(sig, candidates)!.subject.subjectId, 'nearest');
});
