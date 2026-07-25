import type { Fortune } from '@/features/fortune/fortune';

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
