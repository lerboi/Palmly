import {
  DIM_ICON,
  WAITING_NUDGE_MS,
  WAITING_SLOW_MS,
  claimCelebration,
  dimIcon,
  narrativeBlocks,
  resetCelebrations,
  waitingLevel,
} from '../pair';
import { hasRealPair, toPairData } from '@/lib/compatCopy';

/**
 * The pair reveal's mechanics (Audit-4 CO-16, SH-15). Each of these pins a defect that shipped
 * because the logic lived inline in a component this repo cannot render in a test.
 */
describe('pair dimension icons (CO-16)', () => {
  it('keys on the STABLE server key, not display copy', () => {
    expect(dimIcon('emotion')).toBe('heart');
    expect(dimIcon('life_energy')).toBe('life');
    // The old map was keyed on "Energy"/"Emotion" — a label rewrite silently greyed every icon.
    expect(DIM_ICON.Energy).toBeUndefined();
    expect(DIM_ICON.Emotion).toBeUndefined();
  });

  it('falls back to a documented icon for an unknown dimension', () => {
    expect(dimIcon('a_dimension_the_server_added_later')).toBe('sparkle');
    expect(dimIcon('')).toBe('sparkle');
  });

  it('has an icon for every key `toPairData` can emit', () => {
    const data = toPairData(
      {
        score: 50,
        sub_scores: { emotion: 1, mind: 2, life_energy: 3, destiny: 4, elements: 5 },
        narrative: null,
      } as never,
      'Mira',
    );
    expect(data.subScores.length).toBe(5);
    for (const s of data.subScores) expect(DIM_ICON[s.key]).toBeTruthy();
  });
});

describe('pair narrative blocks (CO-16)', () => {
  it('renders nothing for an empty section instead of a bare heading', () => {
    expect(narrativeBlocks({ click: 'we click', stretch: '' })).toHaveLength(1);
    expect(narrativeBlocks({ click: '', stretch: '' })).toHaveLength(0);
    expect(narrativeBlocks({ click: '   ', stretch: '\n' })).toHaveLength(0);
  });

  it('keeps both blocks, in order, when both have prose', () => {
    const blocks = narrativeBlocks({ click: 'a', stretch: 'b' });
    expect(blocks.map((b) => b.body)).toEqual(['a', 'b']);
    expect(blocks[0].title).toContain('click');
  });
});

describe('pair waiting escalation (SH-15)', () => {
  it('goes calm → slow → nudge, and never regresses', () => {
    expect(waitingLevel(0)).toBe('calm');
    expect(waitingLevel(WAITING_SLOW_MS - 1)).toBe('calm');
    expect(waitingLevel(WAITING_SLOW_MS)).toBe('slow');
    expect(waitingLevel(WAITING_NUDGE_MS - 1)).toBe('slow');
    expect(waitingLevel(WAITING_NUDGE_MS)).toBe('nudge');
    expect(waitingLevel(10 * WAITING_NUDGE_MS)).toBe('nudge');
  });
});

describe('pair success haptic (CO-16)', () => {
  beforeEach(() => resetCelebrations());

  it('celebrates a pair exactly once, however many times the screen mounts', () => {
    expect(claimCelebration('pair-1')).toBe(true);
    expect(claimCelebration('pair-1')).toBe(false);
    expect(claimCelebration('pair-1')).toBe(false);
  });

  it('still celebrates a DIFFERENT pair', () => {
    expect(claimCelebration('pair-1')).toBe(true);
    expect(claimCelebration('pair-2')).toBe(true);
  });

  it('treats a missing pairId as one pair, not as a free pass', () => {
    expect(claimCelebration(undefined)).toBe(true);
    expect(claimCelebration(undefined)).toBe(false);
  });
});

/**
 * The compat SHARE card may only exist for a real pair (Audit-4 SH-7). Opening the compat tab from
 * a reveal used to render a finished-looking card reading **0 out of 100** for "Your match", with
 * an invented blurb — a fabricated result the user was then invited to send to a friend.
 */
describe('compat share honesty (SH-7)', () => {
  it('treats a missing, zero or placeholder pair as NO pair', () => {
    expect(hasRealPair(null)).toBe(false);
    expect(hasRealPair(undefined)).toBe(false);
    expect(hasRealPair({ score: 0, partnerName: 'Mei' })).toBe(false);
    expect(hasRealPair({ score: 82, partnerName: 'Your match' })).toBe(false);
    expect(hasRealPair({ score: 82, partnerName: '   ' })).toBe(false);
    expect(hasRealPair({ score: 82 })).toBe(false);
  });

  it('accepts a real scored pair with a real name', () => {
    expect(hasRealPair({ score: 82, partnerName: 'Mei' })).toBe(true);
    expect(hasRealPair({ score: 1, partnerName: 'A' })).toBe(true);
  });
});
