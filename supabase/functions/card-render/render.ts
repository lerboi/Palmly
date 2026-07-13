// Card rasterization + storage (UIUX §3, Backend §8). Kept in the function dir (not _shared) so
// the resvg-wasm dependency stays out of the shared modules the test/CI `deno check` covers. The
// SVG itself comes from the pure, unit-tested `_shared/card-svg.ts`; here we only rasterize it to
// PNG and upload to the public `cards` bucket with immutable cache headers.
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildCardSvg, deriveCardContent, type CardVariant, type Point } from '../_shared/card-svg.ts';

// The resvg wasm binary is fetched once per instance (Supabase's OG-image pattern). Fonts must be
// supplied for text — Noto TTFs ship as function assets at deploy (a CDN/@vercel/og bundles resvg
// the same way). Without fonts resvg still renders the diagram/shapes.
let wasmReady: Promise<void> | null = null;
function ensureWasm(): Promise<void> {
  if (!wasmReady) wasmReady = initWasm(fetch('https://unpkg.com/@resvg/resvg-wasm@2/index_bg.wasm'));
  return wasmReady;
}

async function loadFonts(): Promise<Uint8Array[]> {
  const files = ['NotoSerif-SemiBold.ttf', 'NotoSans-Regular.ttf', 'NotoSerifSC-Regular.otf'];
  const out: Uint8Array[] = [];
  for (const f of files) {
    try {
      out.push(await Deno.readFile(new URL(`./fonts/${f}`, import.meta.url)));
    } catch {
      // font asset not bundled yet (deploy step) — resvg falls back / omits text
    }
  }
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

/** Build → rasterize → upload (immutable) → record a share_cards row. Returns the public URL. */
export async function renderAndStoreCard(admin: SupabaseClient, o: RenderCardOpts): Promise<{ path: string; publicUrl: string }> {
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
  const path = `${o.userId}/${o.sourceId}_${o.variant}.png`;
  const { error: upErr } = await admin.storage.from('cards').upload(path, png, {
    contentType: 'image/png',
    cacheControl: 'public, max-age=31536000, immutable',
    upsert: true,
  });
  if (upErr) throw upErr;
  await admin.from('share_cards').insert({
    user_id: o.userId,
    source_type: o.sourceType,
    source_id: o.sourceId,
    variant: o.variant,
    locale: o.locale ?? 'en',
    storage_path: path,
  });
  return { path, publicUrl: admin.storage.from('cards').getPublicUrl(path).data.publicUrl };
}
