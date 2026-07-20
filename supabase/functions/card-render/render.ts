// Card rasterization + storage (UIUX §3, Backend §8). Kept in the function dir (not _shared) so
// the resvg-wasm dependency stays out of the shared modules the test/CI `deno check` covers. The
// SVG itself comes from the pure, unit-tested `_shared/card-svg.ts`; here we only rasterize it to
// PNG and upload to the public `cards` bucket with immutable cache headers.
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildCardSvg, buildCompatCardSvg, deriveCardContent, type CardVariant, type Point } from '../_shared/card-svg.ts';
import { DRAFT_BUCKET, PUBLIC_BUCKET, publishCard } from '../_shared/card-publish.ts';

// Re-export so existing importers (card-render/index.ts) keep their path; the logic now lives in
// _shared/card-publish.ts (no resvg) so `share-card-publish` can call it without the rasterizer.
export { DRAFT_BUCKET, PUBLIC_BUCKET, publishCard };

// The resvg wasm binary is vendored next to this file and read from disk (M4): fetching it from a
// third-party npm CDN at cold start made every card render depend on that CDN being up, and
// silently wedged the function when it was not. It ships as a function asset at deploy, like the
// fonts. (Keep this file free of that CDN's hostname — `git grep` for it is the regression check.)
let wasmReady: Promise<void> | null = null;
function ensureWasm(): Promise<void> {
  if (!wasmReady) wasmReady = initWasm(Deno.readFile(new URL('./index_bg.wasm', import.meta.url)));
  return wasmReady;
}

// Noto (SIL OFL 1.1 — bundling with software is permitted; see fonts/LICENSE) ships as function
// assets. `loadSystemFonts: false` means these buffers are the ONLY fonts resvg has, so a missing
// file is not a degraded card — it is a card with NO TEXT AT ALL. That is exactly what shipped: the
// fonts/ dir did not exist and the old `catch {}` swallowed every miss, so resvg received an empty
// array and dropped every string (M4). Failing loudly is the point.
const FONT_FILES = ['NotoSerif-SemiBold.ttf', 'NotoSans-Regular.ttf', 'NotoSerifSC-Regular.otf'];

let fontsCache: Uint8Array[] | null = null;
async function loadFonts(): Promise<Uint8Array[]> {
  if (fontsCache) return fontsCache;
  const out: Uint8Array[] = [];
  for (const f of FONT_FILES) {
    try {
      out.push(await Deno.readFile(new URL(`./fonts/${f}`, import.meta.url)));
    } catch (e) {
      throw new Error(`card-render: font asset ${f} is missing — cards would render with no text (${e instanceof Error ? e.message : e})`);
    }
  }
  fontsCache = out;
  return out;
}

export async function renderCardPng(svg: string): Promise<Uint8Array> {
  await ensureWasm();
  const fontBuffers = await loadFonts();
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1080 },
    font: { fontBuffers, defaultFontFamily: 'Noto Serif', loadSystemFonts: false },
  });
  return resvg.render().asPng();
}

export interface RenderCardOpts {
  userId: string;
  sourceType: 'reading' | 'compatibility' | 'fortune';
  sourceId: string;
  variant: CardVariant;
  features: Record<string, unknown>;
  attribution?: string;
  locale?: string;
}

/** Rasterized PNG → upload to the PRIVATE draft bucket + upsert the `share_cards` row. Shared by
 *  every card class (solo, compat, fortune). Returns the card id + path; no public URL yet —
 *  `publishCard` mints that on share intent (H8). */
async function storeCard(
  admin: SupabaseClient,
  o: { userId: string; sourceType: 'reading' | 'compatibility' | 'fortune'; sourceId: string; variant: CardVariant; locale?: string },
  png: Uint8Array,
): Promise<{ cardId: string; path: string; published: boolean }> {
  const path = `${o.userId}/${o.sourceId}_${o.variant}.png`;
  // Private by default (H8). The immutable cache header rides along to the public copy, so a
  // published card is still CDN-cacheable forever.
  const { error: upErr } = await admin.storage.from(DRAFT_BUCKET).upload(path, png, {
    contentType: 'image/png',
    cacheControl: 'public, max-age=31536000, immutable',
    upsert: true,
  });
  if (upErr) throw upErr;

  // upsert: a re-render of the same (source, variant) must not accumulate duplicate rows, and must
  // not silently un-publish a card the user has already shared.
  const { data: card, error: insErr } = await admin
    .from('share_cards')
    .upsert(
      { user_id: o.userId, source_type: o.sourceType, source_id: o.sourceId, variant: o.variant, locale: o.locale ?? 'en', storage_path: path },
      { onConflict: 'user_id,source_id,variant', ignoreDuplicates: false },
    )
    .select('id, published_at')
    .single();
  if (insErr || !card) throw insErr ?? new Error('card-render: share_cards upsert returned no row');

  // If the user had already shared this card, a re-render must refresh the public copy too —
  // otherwise the CDN keeps serving the stale PNG.
  if (card.published_at) {
    const { error: cpErr } = await admin.storage.from(DRAFT_BUCKET).copy(path, path, { destinationBucket: PUBLIC_BUCKET });
    if (cpErr) throw cpErr;
  }
  return { cardId: card.id, path, published: Boolean(card.published_at) };
}

/** Build → rasterize → store the SOLO palm/face card. */
export async function renderAndStoreCard(admin: SupabaseClient, o: RenderCardOpts): Promise<{ cardId: string; path: string; published: boolean }> {
  const content = deriveCardContent(o.features);
  const svg = buildCardSvg({
    variant: o.variant,
    headline: content.headline,
    chips: content.chips,
    signatureLines: content.signatureLines,
    lineGeometry: (o.features.line_geometry ?? {}) as Record<string, Point[]>,
    attribution: o.attribution,
  });
  const png = await renderCardPng(svg);
  return storeCard(admin, { userId: o.userId, sourceType: o.sourceType, sourceId: o.sourceId, variant: o.variant, locale: o.locale }, png);
}

// ── Compatibility card (audit F1.T9): the two members' palms joined by the claret heart-thread. ──
export interface CompatRenderOpts {
  userId: string; // owner of this share_cards row (the sharing member)
  sourceId: string; // the pair id
  variant: CardVariant;
  headline: string;
  score: number | null;
  nameA: string;
  nameB: string;
  geometryA: Record<string, Point[]>;
  geometryB: Record<string, Point[]>;
  chips: string[];
  attribution?: string;
  locale?: string;
}

/** Build → rasterize → store the COMPATIBILITY card (two palms + red thread + score ring). */
export async function renderAndStoreCompatCard(admin: SupabaseClient, o: CompatRenderOpts): Promise<{ cardId: string; path: string; published: boolean }> {
  const svg = buildCompatCardSvg({
    variant: o.variant,
    headline: o.headline,
    score: o.score,
    nameA: o.nameA,
    nameB: o.nameB,
    geometryA: o.geometryA,
    geometryB: o.geometryB,
    chips: o.chips,
    attribution: o.attribution,
  });
  const png = await renderCardPng(svg);
  return storeCard(admin, { userId: o.userId, sourceType: 'compatibility', sourceId: o.sourceId, variant: o.variant, locale: o.locale }, png);
}
