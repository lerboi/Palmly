// Card publication (Backend §8, §13, UIUX §3) — the ONLY thing that moves a share card onto the CDN.
// Kept in _shared (no resvg dependency) so both card-render (secret pre-render) and the user-mode
// `share-card-publish` endpoint can call it without bundling the rasterizer into a publish-only fn.
import type { SupabaseClient } from '@supabase/supabase-js';

/** Private staging for pre-rendered cards; `PUBLIC_BUCKET` holds only what a user chose to share. */
export const DRAFT_BUCKET = 'card-drafts';
export const PUBLIC_BUCKET = 'cards';

/**
 * Publish a pre-rendered card on share intent (H8): copy the draft into the public bucket and stamp
 * `published_at`. Idempotent — re-sharing the same card is a no-op that returns the same URL.
 *
 * This is the ONLY thing that puts a card on the CDN. Until it runs, the card exists solely in the
 * private bucket, so a reading being generated never publishes the user's palm + display name.
 */
export async function publishCard(admin: SupabaseClient, cardId: string): Promise<{ path: string; publicUrl: string }> {
  const { data: card, error } = await admin
    .from('share_cards')
    .select('id, user_id, storage_path, published_at')
    .eq('id', cardId)
    .single();
  if (error || !card) throw new Error(`publishCard: share_card ${cardId} not found`);

  const publicUrl = admin.storage.from(PUBLIC_BUCKET).getPublicUrl(card.storage_path).data.publicUrl;
  if (card.published_at) return { path: card.storage_path, publicUrl }; // already shared → no-op

  // Copy draft → public. The draft is deliberately left in place: it is the render cache that keeps
  // a re-share instant, and it costs nothing beyond storage the user already implicitly holds.
  const { error: cpErr } = await admin.storage.from(DRAFT_BUCKET).copy(card.storage_path, card.storage_path, {
    destinationBucket: PUBLIC_BUCKET,
  });
  if (cpErr) throw cpErr;

  // Stamp only after the object is actually public — same ordering discipline as B4/H7: never claim
  // a state the storage layer has not reached.
  const { error: upErr } = await admin.from('share_cards').update({ published_at: new Date().toISOString() }).eq('id', cardId);
  if (upErr) throw upErr;

  return { path: card.storage_path, publicUrl };
}
