/**
 * The `post_share` paywall trigger (Audit-5 RF0.T2, strategy 01 §7 T5).
 *
 * The trigger id has been in the taxonomy — and in `PaywallView`'s hero map — since F0.T12, but
 * **nothing ever emitted it**: the share sheet closed straight back to wherever it came from. This
 * module is the decision, kept pure and separate from the route so the rules are unit-testable and
 * so exactly ONE place decides them.
 *
 * The rules exist to keep the moment generous rather than grabby (01 §7: "give first, sell second"):
 *   - only after a share/copy actually COMPLETED — closing an unused sheet is not a conversion beat;
 *   - never to a premium user (there is nothing to sell them);
 *   - never on a day-1 user — someone who has been in the app for one day has just had their first
 *     wow, and monetizing the first share is exactly the pre-value paywall the research warns about;
 *   - at most once per app session, so a user who shares three cards meets one offer, not three.
 */

export interface PostShareInput {
  /** A share or copy-link actually completed while the sheet was open. */
  shared: boolean;
  /** Premium users are never offered the paywall. */
  premium: boolean;
  /** Distinct days this user has shown up (the daily ledger's history length). */
  daysActive: number;
  /** The offer has already been made once this session. */
  offeredThisSession: boolean;
}

/** Day-1 users are exempt: the run must reach a second day before the offer is allowed. */
export const POST_SHARE_MIN_DAYS_ACTIVE = 2;

export function shouldOfferPostShare(input: PostShareInput): boolean {
  if (!input.shared) return false;
  if (input.premium) return false;
  if (input.offeredThisSession) return false;
  return input.daysActive >= POST_SHARE_MIN_DAYS_ACTIVE;
}

// ── Session state (deliberately in-memory) ────────────────────────────────────────────────────────
// "Once per session" means once per app process: a fresh launch may offer again. Persisting it would
// make the offer once-ever, which is a different (and worse) rule — the moment is meant to recur for
// the users who keep sharing, just never twice in one sitting.
let offered = false;

export const postShareOffered = (): boolean => offered;
export const markPostShareOffered = (): void => {
  offered = true;
};
/** Test-only: reset the session flag between cases. */
export const resetPostShareOffered = (): void => {
  offered = false;
};
