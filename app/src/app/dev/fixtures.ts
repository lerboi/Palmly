import type { Fortune } from '@/features/fortune/fortune';
import type { Reading } from '@/features/reading/reveal';

/**
 * `/dev`-only fixtures. These live HERE, not in the production module, so a fixture can never be
 * imported by a shipped screen by accident (Audit-4 micro-bugs: `PREVIEW_*` were exported from
 * production files). Only routes under `src/app/dev/` may import from this file.
 */
export const PREVIEW_FORTUNE: Fortune = {
  overall: 'A steady, favourable day — move with intention and doors open quietly.',
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
