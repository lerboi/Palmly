import { supabase } from './supabase';

/**
 * Share-invite minting (audit F0.4; Backend §8). Calls the deployed user-mode `invite-create`, which
 * inserts an RLS-scoped `invites` row (inviter = the caller) and returns the one-time shareable URL.
 * Since F0.T7 the URL base is env-driven server-side (the deployed functions origin on staging, the
 * `palmly.app/i` domain later) so minted links resolve today. Anonymous users can't mint (invites
 * RLS `invites_insert_permanent_only`); the caller needs a linked account (F0.T11).
 */
export interface CreatedInvite {
  inviteId: string;
  url: string;
}

/** The sender's relationship framing (UIUX §2.7 — narrative tone + card-copy variant, audit F1.7). */
export type Framing = 'friend' | 'partner' | 'crush' | 'family';

export async function createInvite(params: {
  readingId?: string;
  /** The published share-card URL (from {@link publishShareCard}) → the invite's OG preview image. */
  cardImageUrl?: string;
  kind?: 'compatibility' | 'generic';
  channel?: string;
  /** Relationship framing → `invites.context.framing` (server allowlists it, F1.T8). */
  framing?: Framing;
}): Promise<CreatedInvite> {
  const context: Record<string, unknown> = {};
  if (params.readingId) context.reading_id = params.readingId;
  if (params.cardImageUrl) context.card_image_url = params.cardImageUrl;
  if (params.framing) context.framing = params.framing;
  const { data, error } = await supabase.functions.invoke('invite-create', {
    body: {
      kind: params.kind ?? 'compatibility',
      ...(Object.keys(context).length ? { context } : {}),
      ...(params.channel ? { channel: params.channel } : {}),
    },
  });
  const res = (data ?? {}) as { invite_id?: string; url?: string };
  if (error || !res.invite_id || !res.url) {
    throw new Error('invite-create failed');
  }
  return { inviteId: res.invite_id, url: res.url };
}

/**
 * The caller's pre-rendered DRAFT share card for a reading (audit A6). worker-narrative pre-renders
 * one keyed `source_id = readingId`, `variant = 'feed_4x5'` (§6.1); `share_cards_select_own` RLS
 * scopes the read to the owner, so at most one row. Returns its id (to {@link publishShareCard}) or
 * `null` when no draft exists yet — the share still mints, just without an OG image.
 */
export async function loadDraftShareCardId(readingId: string, variant = 'feed_4x5'): Promise<string | null> {
  const { data } = await supabase
    .from('share_cards')
    .select('id')
    .eq('source_id', readingId)
    .eq('variant', variant)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

/**
 * Publish the caller's pre-rendered share card to the public CDN via the deployed user-mode
 * `share-card-publish` (audit F0.4; ownership-checked server-side) → the public URL to pass as
 * {@link createInvite}'s `cardImageUrl`. Wired at share time in ShareView via
 * {@link loadDraftShareCardId} (audit A6 — this path used to be called by nothing).
 */
export async function publishShareCard(cardId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('share-card-publish', { body: { card_id: cardId } });
  const res = (data ?? {}) as { publicUrl?: string };
  if (error || !res.publicUrl) {
    throw new Error('share-card-publish failed');
  }
  return res.publicUrl;
}

/** The pre-composed share message (UIUX §2.6) — the essence + a compare invite when a URL is present. */
export function composeShareText(headline: string, url?: string): string {
  const lead = `Palmly read my palm — ${headline}`;
  return url ? `${lead}\nSee what yours says & compare palms: ${url}` : lead;
}
