import {
  markPostShareOffered,
  postShareOffered,
  resetPostShareOffered,
  shouldOfferPostShare,
  POST_SHARE_MIN_DAYS_ACTIVE,
} from '../postShare';

/**
 * RF0.T2 — the `post_share` trigger's decision (01 §7 T5). The trigger id shipped in the taxonomy
 * with no call site; these are the rules that now decide whether it fires.
 */

const base = { shared: true, premium: false, daysActive: 5, offeredThisSession: false };

describe('shouldOfferPostShare', () => {
  beforeEach(resetPostShareOffered);

  it('offers after a share that actually completed, for a returning free user', () => {
    expect(shouldOfferPostShare(base)).toBe(true);
  });

  it('never offers when the sheet closed without a share', () => {
    expect(shouldOfferPostShare({ ...base, shared: false })).toBe(false);
  });

  it('never offers to a premium user — there is nothing to sell', () => {
    expect(shouldOfferPostShare({ ...base, premium: true })).toBe(false);
  });

  it('never offers on a day-1 user (no paywall on the first wow)', () => {
    expect(shouldOfferPostShare({ ...base, daysActive: 1 })).toBe(false);
    expect(shouldOfferPostShare({ ...base, daysActive: 0 })).toBe(false);
    expect(shouldOfferPostShare({ ...base, daysActive: POST_SHARE_MIN_DAYS_ACTIVE })).toBe(true);
  });

  it('offers at most once per session', () => {
    expect(shouldOfferPostShare({ ...base, offeredThisSession: false })).toBe(true);
    expect(shouldOfferPostShare({ ...base, offeredThisSession: true })).toBe(false);
  });
});

describe('session flag', () => {
  beforeEach(resetPostShareOffered);

  it('starts clear, latches once marked', () => {
    expect(postShareOffered()).toBe(false);
    markPostShareOffered();
    expect(postShareOffered()).toBe(true);
  });

  it('a latched session flag suppresses a second offer', () => {
    markPostShareOffered();
    expect(shouldOfferPostShare({ ...base, offeredThisSession: postShareOffered() })).toBe(false);
  });
});
