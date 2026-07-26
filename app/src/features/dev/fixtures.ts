import type { Fortune } from '@/features/fortune/fortune';
import type { Reading } from '@/features/reading/reveal';
import type { PairData } from '@/features/reading/PairRevealView';
import type { CompatShareData } from '@/lib/compatCopy';
import type { Pulse } from '@/lib/pulseData';
import { describeChapter, type DescribedChapter } from '@/features/pulse/chapters';
import { chapterFor } from '@/features/pulse/pulseMath';

/**
 * `/dev`-only fixtures. These live HERE, not in the production module, so a fixture can never be
 * imported by a shipped screen by accident (Audit-4 micro-bugs: `PREVIEW_*` were exported from
 * production files). Only routes under `src/app/dev/` may import from this file.
 *
 * It sits in `features/dev/`, NOT in `src/app/dev/`: expo-router treats **every** file under the
 * app directory as a route, so a plain module there is reported at startup as
 * `Route "./dev/fixtures.ts" is missing the required default export` — a warning that is really
 * saying "this file is in the routes tree and shouldn't be".
 */
export const PREVIEW_FORTUNE: Fortune = {
  overall: 'A steady, favorable day — move with intention and doors open quietly.',
  career: 'Progress through patience; a senior notices your reliability.',
  love: 'Warmth returned in kind. Say the honest thing.',
  wealth: 'Hold, don’t chase — a small saving beats a big gamble.',
  dos: ['Sign what’s ready', 'Reach out first', 'Tidy one loose end'],
  donts: ['Lend impulsively', 'Argue over trifles', 'Skip your rest'],
  lucky_direction: 'Southeast',
  lucky_color: 'Jade green',
  lucky_hours: '7–9am · 3–5pm',
};

/**
 * A palm reading carrying ALL SEVEN section keys as free sections (Audit-4 CO-5 verification).
 * Production readings never look like this — the point is to render every thumb the section map can
 * produce on one screen, so "every section thumb is visually distinct" is measurable rather than
 * asserted. Bodies are one line each; the thumbs are what this fixture exists for.
 */
export const PREVIEW_ALL_SECTIONS_READING: Reading = {
  headline: 'Every section, side by side.',
  summary: 'A /dev fixture: all seven palm sections free, so their thumbnails can be compared.',
  sections: (
    [
      ['hand_shape', 'Your hand — the shape of you'],
      ['heart', 'Your heart line — how you love'],
      ['head', 'Your head line — how you think'],
      ['life', 'Your life line — your vitality'],
      ['fate', 'Your fate line — your path'],
      ['mounts', 'Your mounts — where you carry strength'],
      ['markings', 'Rare markings — stars, crosses & more'],
    ] as const
  ).map(([key, title]) => ({
    key,
    title,
    body: 'A one-line body: this fixture exists to compare the section thumbnails, not the prose.',
    depth_level: 1,
    tags: [`${key}.preview`],
    feature_refs: [`${key}.preview`],
  })),
  disclaimer: 'For reflection and entertainment.',
};

/**
 * A representative compatibility result (Audit-4 U5.T3, closing the gap D24 flagged): `(reading)/pair`
 * has been unreachable device-free since it was built, which is why U1.T2's pair CTA had to stay
 * `[~]`. Sub-scores carry their STABLE server keys so the dimension icons resolve the same way they
 * do in production.
 */
export const PREVIEW_PAIR: PairData = {
  partnerName: 'Mira',
  score: 78,
  headline: 'Two steady hands — you settle each other.',
  subScores: [
    { key: 'emotion', label: 'Emotion', value: 84 },
    { key: 'mind', label: 'Mind', value: 71 },
    { key: 'life_energy', label: 'Energy', value: 66 },
    { key: 'destiny', label: 'Destiny', value: 80 },
    { key: 'elements', label: 'Elements', value: 74 },
  ],
  click: 'Your heart lines run the same depth — you both give warmth slowly and mean it when you do.',
  stretch: 'Your head lines part ways: you think in images, they think in steps. That gap is the work, and the gift.',
};

/** The same pair with a HALF-GENERATED narrative — the CO-16 case that printed a bare heading. */
export const PREVIEW_PAIR_PARTIAL: PairData = { ...PREVIEW_PAIR, click: PREVIEW_PAIR.click, stretch: '' };

/** The compat SHARE card's fixture (Audit-4 SH-7). The blurb and chips used to be hardcoded
 *  DEFAULTS inside `ShareView`, so a real user's card carried this invented prose; they live here
 *  now, where only `/dev` can reach them. */
export const PREVIEW_COMPAT_SHARE: CompatShareData = {
  score: 82,
  partnerName: 'Mei',
  blurb: 'A rare, easy resonance — you steady each other.',
  chips: ['Emotion', 'Mind', 'Energy', 'Destiny'],
};

/**
 * A representative Today's Line (Audit-5 RF2.T2). Real generated content from the `eval/rf.ts
 * --live` run of 2026-07-26, so the `/dev` card is measuring the same prose length the production
 * card will get — a fixture written to fit would prove nothing about the 320pt sweep.
 */
export const PREVIEW_PULSE: Pulse = {
  essence: 'Your heart line favors patience on a Fire Rooster day.',
  reading:
    'The tradition reads a Fire day as one that wants to move first and ask second, and a deep heart line as the part of you that would rather be sure. Today those two pull against each other. Neither is wrong; the day just goes better if the heart sets the pace.',
  career: 'Warmth lands better than pressure in the room you need something from.',
  love: 'The honest sentence, said plainly, is the one that carries today.',
  wealth: 'A day that favors holding a position rather than chasing a new one.',
  watch: 'Notice the urge to explain yourself a second time.',
  chapter_tone: 'A stretch that rewards steadiness over reach.',
};

/** The feature the `/dev` pulse fixtures read — a palm LINE, so the diagram has something to light. */
export const PREVIEW_PULSE_FEATURE = 'heart';

/** A stable fixture chapter. Pinned to a date so the screenshots do not change with the calendar. */
export const PREVIEW_CHAPTER: DescribedChapter =
  describeChapter(chapterFor(PREVIEW_PULSE_FEATURE, 'dev-fixture-hash', '2026-07-26'), PREVIEW_PULSE_FEATURE)!;

/** The same chapter on its FIRST day — the boundary-banner fixture. */
export const PREVIEW_BOUNDARY_CHAPTER: DescribedChapter =
  describeChapter(chapterFor(PREVIEW_PULSE_FEATURE, 'dev-fixture-hash', PREVIEW_CHAPTER.starts_on), PREVIEW_PULSE_FEATURE)!;
