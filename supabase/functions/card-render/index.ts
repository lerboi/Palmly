// card-render (Backend §4, §8, UIUX §3) — secret (internal) auth. Renders a reading's solo-palm
// share card PNG (the pure SVG from _shared/card-svg.ts → resvg) into the PRIVATE `card-drafts`
// bucket, immutable-cached, so sharing is instant. Called by worker-narrative's pre-render hook
// (§6.1) and on-demand for other variants.
//
// H8: a pre-rendered card is NOT published. Spec §13/§9 — the public `cards` bucket holds only
// user-initiated share cards, so nothing reaches the CDN until `{"action":"publish"}` is called with
// a share intent. Pre-render keeps the share instant; publication is what the user actually chose.
import { createContext, requireMode } from '../_shared/context.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { publishCard, renderAndStoreCard } from './render.ts';
import type { CardVariant } from '../_shared/card-svg.ts';

interface Body {
  action?: 'render' | 'publish';
  card_id?: string; // publish
  feature_set_id?: string; // render
  variant?: CardVariant;
  source_type?: 'reading' | 'compatibility' | 'fortune';
  source_id?: string;
}

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'secret'); // internal only — invoked by the pipeline with the service key

    const body = (await req.json().catch(() => ({}))) as Body;

    // share intent → copy the draft onto the CDN. The only path that publishes anything.
    if (body.action === 'publish') {
      if (!body.card_id) throw new AppError('bad_request', 'card_id is required to publish', 400);
      return jsonResponse(await publishCard(ctx.admin, body.card_id));
    }

    if (!body.feature_set_id) throw new AppError('bad_request', 'feature_set_id is required', 400);
    const variant: CardVariant = body.variant ?? 'feed_4x5';

    const { data: fs } = await ctx.admin.from('feature_sets').select('user_id, features').eq('id', body.feature_set_id).single();
    if (!fs) throw new AppError('not_found', 'feature_set not found', 404);

    const { data: profile } = await ctx.admin.from('profiles').select('display_name, locale').eq('id', fs.user_id).maybeSingle();

    const res = await renderAndStoreCard(ctx.admin, {
      userId: fs.user_id,
      sourceType: body.source_type ?? 'reading',
      sourceId: body.source_id ?? body.feature_set_id,
      variant,
      features: fs.features as Record<string, unknown>,
      attribution: profile?.display_name ?? undefined,
      locale: profile?.locale ?? 'en',
    });
    return jsonResponse(res);
  }),
);
