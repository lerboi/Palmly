/**
 * The ONE canonical deletion promise (audit F1.5, Backend §9). Every "your photo is deleted" surface
 * renders this exact string — materially-different claims across screens are exactly what the copy
 * exists to prevent, aimed at the audience most likely to screenshot it.
 *
 * This module is deliberately dependency-free (no `supabase`/analytics imports) so pure copy/data
 * modules — the primer rows, the analyzing/reveal rotating lines — can import the canonical string
 * without dragging the client SDK (and its native AsyncStorage) into their unit tests. The trust
 * *actions* (delete/keep/notify) live in `./privacy`, which pairs the copy with those writes.
 */
export const CANONICAL_DELETION_PROMISE = 'Your photo is deleted right after your reading — always within 24 hours.';
/** Short form for tight spaces (badges/rows) — same promise, no contradiction. */
export const CANONICAL_DELETION_SHORT = 'Deleted right after your reading — within 24 hours.';
/**
 * The badge's honest DEFAULT (Audit-4 SH-8). `PrivacyBadge` used to default to "Photo deleted",
 * which the pending reveal and the history header both rendered while the photo may well still
 * exist — a claim about the user's data that the app had not yet earned. A promise the app always
 * keeps is not a lie; a past-tense claim it cannot check is.
 */
export const CANONICAL_DELETION_BADGE = 'Photo deletes within 24 hours';
/** The keep-my-scan opt-in (D2): the badge must say "saved", never "deleted". */
export const CANONICAL_PHOTO_KEPT = 'Photo saved to your account — delete anytime';
