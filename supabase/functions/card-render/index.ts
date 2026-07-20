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
import { publishCard, renderAndStoreCard, renderAndStoreCompatCard } from './render.ts';
import { deriveCompatCardContent, type CardVariant, type Point } from '../_shared/card-svg.ts';

interface Body {
  action?: 'render' | 'publish';
  card_id?: string; // publish
  feature_set_id?: string; // render (solo)
  variant?: CardVariant;
  source_type?: 'reading' | 'compatibility' | 'fortune';
  source_id?: string; // reading id (solo) or pair id (compatibility)
  attribution?: string; // consent-gated "«Name»'s" byline (the sheet passes it only when opted in)
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

    const variant: CardVariant = body.variant ?? 'feed_4x5';

    // ── Compatibility card (F1.T9): source_id is the PAIR id — load both members' geometries + the
    //    scored result, then render the two-palms/red-thread/score-ring card. ──
    if (body.source_type === 'compatibility') {
      const pairId = body.source_id;
      if (!pairId) throw new AppError('bad_request', 'source_id (pair id) is required for a compatibility card', 400);
      const { data: pair } = await ctx.admin.from('compatibility_pairs').select('user_a, user_b').eq('id', pairId).maybeSingle();
      if (!pair) throw new AppError('not_found', 'pair not found', 404);
      const { data: result } = await ctx.admin
        .from('compatibility_results')
        .select('status, score, sub_scores, narrative, feature_set_a, feature_set_b')
        .eq('pair_id', pairId)
        .maybeSingle();
      const loadGeom = async (fsId?: string | null): Promise<Record<string, Point[]>> => {
        if (!fsId) return {};
        const { data } = await ctx.admin.from('feature_sets').select('features').eq('id', fsId).maybeSingle();
        return ((data?.features as { line_geometry?: Record<string, Point[]> } | undefined)?.line_geometry ?? {}) as Record<string, Point[]>;
      };
      const nameOf = async (uid: string): Promise<string | undefined> =>
        ((await ctx.admin.from('profiles').select('display_name').eq('id', uid).maybeSingle()).data?.display_name as string | null) ?? undefined;
      const [geometryA, geometryB, nameA, nameB] = await Promise.all([
        loadGeom(result?.feature_set_a),
        loadGeom(result?.feature_set_b),
        nameOf(pair.user_a),
        nameOf(pair.user_b),
      ]);
      const content = deriveCompatCardContent(result ?? {});
      return jsonResponse(
        await renderAndStoreCompatCard(ctx.admin, {
          userId: pair.user_a, // owner (Decision D3-02: user_a for now; per-member sharing is a later leg)
          sourceId: pairId,
          variant,
          headline: content.headline,
          score: result?.status === 'complete' && typeof result?.score === 'number' ? result.score : null,
          nameA: nameA ?? 'You',
          nameB: nameB ?? 'Your match',
          geometryA,
          geometryB,
          chips: content.chips,
          attribution: body.attribution,
          locale: 'en',
        }),
      );
    }

    // ── Solo palm/face — keyed on a feature_set ──
    if (!body.feature_set_id) throw new AppError('bad_request', 'feature_set_id is required', 400);

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
