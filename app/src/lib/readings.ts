import { supabase } from './supabase';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import type { Reading } from '@/features/reading/reveal';
import type { ReadingSummary } from '@/features/reading/history';

/**
 * Reads for the reveal + history surfaces (audit F0.3; Backend §4 — "simple reads go straight
 * through supabase-js + RLS"). RLS scopes every row to the caller, so these need no user-id filter;
 * a foreign-owned row is simply invisible (→ the caller's error/empty state).
 *
 * The stored `readings.narrative` jsonb IS the client {@link Reading} shape 1:1 (server
 * `NarrativeSection` === client `ReadingSection`). The drawable polylines live on
 * `feature_sets.features.line_geometry` (client {@link LineGeometry}) — NOT on `feature_sets.geometry`,
 * which is only the scale-invariant match signature.
 */

/** The scale-invariant hand-shape signature stored on `feature_sets.geometry.hand` (Backend §6.6
 *  item 3). The Seal-the-day ritual compares a live on-device signature against this one — no photo,
 *  no upload, no tokens (Audit-5 RF3). Owner-readable under the existing feature_sets RLS. */
export interface StoredHandSignature {
  fingers: number[];
  palm_width: number;
}

/** A loaded reading plus the geometry to draw its palm/face and its id/kind. */
export interface LoadedReading {
  id: string;
  kind: 'palm' | 'face';
  reading: Reading;
  geometry: LineGeometry;
  /**
   * `feature_sets.feature_hash` — the deterministic semantic hash of this reading's features. Line
   * Cycles seeds each chapter's schedule from it (Audit-5 03 §4.2), so two readers are never on the
   * same rhythm and the same reader's lines turn pages independently.
   */
  featureHash: string | null;
  /** `feature_sets.geometry.hand` — the enrolled palm signature the check-in ritual matches against. */
  handSignature: StoredHandSignature | null;
  /** When the source photo was ACTUALLY deleted (scans.image_deleted_at) — null until it is.
   *  Never falls back to the upload time: claiming "deleted" while the crop sits in the bucket
   *  is the trust-break this product exists to avoid (found live 2026-07-25). */
  photoDeletedAt: string | null;
  /** The user's keep-my-scan opt-in (D2) — the badge says "saved", not "deleted". */
  photoKept: boolean;
}

/** Pull `features.line_geometry` out of an embedded feature_sets row (object or one-element array). */
function geometryFrom(featureSets: unknown): LineGeometry {
  const one = Array.isArray(featureSets) ? featureSets[0] : featureSets;
  const features = (one as { features?: Record<string, unknown> } | undefined)?.features;
  const lg = features?.line_geometry;
  return lg && typeof lg === 'object' ? (lg as LineGeometry) : {};
}

/** Pull the source scan's real deletion state out of the nested `scans` embed. */
function photoStateFrom(featureSets: unknown): { deletedAt: string | null; kept: boolean } {
  const one = Array.isArray(featureSets) ? featureSets[0] : featureSets;
  const scans = (one as { scans?: unknown } | undefined)?.scans;
  const scan = Array.isArray(scans) ? scans[0] : scans;
  const s = scan as { image_deleted_at?: string | null; keep_image?: boolean | null } | undefined;
  return { deletedAt: s?.image_deleted_at ?? null, kept: s?.keep_image === true };
}

/** The embedded feature_set row, whichever shape PostgREST returned it in. */
const featureSetRow = (featureSets: unknown): Record<string, unknown> | undefined => {
  const one = Array.isArray(featureSets) ? featureSets[0] : featureSets;
  return one && typeof one === 'object' ? (one as Record<string, unknown>) : undefined;
};

/**
 * The enrolled hand signature, validated rather than trusted (Audit-5 RF3.T1).
 *
 * Mirrors the server's `parseHandSignature`: four finite positive finger chains plus a palm width.
 * A malformed signature must resolve to `null` — the ritual then simply offers the tap fallback,
 * which is the honest outcome. Silently comparing against `undefined` would make every check-in
 * fail with copy that blames the user's lighting.
 */
function handSignatureFrom(featureSets: unknown): StoredHandSignature | null {
  const geo = featureSetRow(featureSets)?.geometry as { hand?: unknown } | undefined;
  const hand = geo?.hand as { fingers?: unknown; palm_width?: unknown } | undefined;
  if (!hand || typeof hand !== 'object') return null;
  const { fingers, palm_width: palmWidth } = hand;
  if (!Array.isArray(fingers) || fingers.length !== 4) return null;
  if (!fingers.every((f) => typeof f === 'number' && Number.isFinite(f) && f > 0 && f < 5)) return null;
  if (typeof palmWidth !== 'number' || !Number.isFinite(palmWidth) || palmWidth <= 0 || palmWidth >= 5) return null;
  return { fingers: fingers as number[], palm_width: palmWidth };
}

function toLoaded(row: Record<string, unknown>): LoadedReading {
  const photo = photoStateFrom(row.feature_sets);
  const fs = featureSetRow(row.feature_sets);
  return {
    id: row.id as string,
    kind: row.kind as 'palm' | 'face',
    reading: row.narrative as Reading,
    geometry: geometryFrom(row.feature_sets),
    featureHash: typeof fs?.feature_hash === 'string' ? fs.feature_hash : null,
    handSignature: handSignatureFrom(row.feature_sets),
    photoDeletedAt: photo.deletedAt,
    photoKept: photo.kept,
  };
}

// The reading select, in ONE place (Audit-5 RF3.T1 added `geometry` + `feature_hash` and there are
// three call sites below — three chances to add it to two of them). `geometry` is the scale-invariant
// signature, NOT the drawable polylines; those stay on `features.line_geometry`.
const FS_COLUMNS = 'features, geometry, feature_hash';

/**
 * Load one reading by its own id, or by the scan id that produced it (readings →
 * feature_sets.scan_id). Returns null when no matching reading is visible to the caller.
 *
 * MATCHED scans (Backend §6.6 item 4) need the fallback leg: a matched scan deliberately has NO
 * feature_set of its own — the pipeline reused the subject's canonical — so the scan-keyed join
 * finds nothing (live 2026-07-25: the first real matched scan error-stated the reveal). The DB
 * enforces one subject per (user, kind+side), so the caller's NEWEST reading of the scan's
 * kind+side IS the canonical's reading.
 */
export async function loadReading(params: { readingId?: string; scanId?: string }): Promise<LoadedReading | null> {
  if (params.readingId) {
    const { data, error } = await supabase
      .from('readings')
      .select(`id, kind, narrative, feature_sets!inner(${FS_COLUMNS}, scans(image_deleted_at, keep_image))`)
      .eq('id', params.readingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return toLoaded(data as Record<string, unknown>);
  }
  if (!params.scanId) return null;

  const direct = await supabase
    .from('readings')
    .select(`id, kind, narrative, feature_sets!inner(${FS_COLUMNS}, scan_id, scans(image_deleted_at, keep_image))`)
    .eq('feature_sets.scan_id', params.scanId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (direct.data) return toLoaded(direct.data as Record<string, unknown>);
  if (direct.error) return null;

  // No feature_set for this scan → matched path. Resolve via the scan's kind+side.
  const { data: scan } = await supabase.from('scans').select('kind, side').eq('id', params.scanId).maybeSingle();
  if (!scan) return null;
  let byKind = supabase
    .from('readings')
    .select(`id, kind, narrative, feature_sets!inner(${FS_COLUMNS}, side, scans(image_deleted_at, keep_image))`)
    .eq('kind', scan.kind as string);
  if (scan.side) byKind = byKind.eq('feature_sets.side', scan.side as string);
  const { data: canonical, error: canonErr } = await byKind
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (canonErr || !canonical) return null;
  return toLoaded(canonical as Record<string, unknown>);
}

/** List the caller's readings, newest first, as shelf summaries (empty array when none / on error). */
export async function loadHistory(): Promise<ReadingSummary[]> {
  const { data, error } = await supabase
    .from('readings')
    .select('id, kind, created_at, narrative, feature_sets!inner(features)')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    kind: row.kind as 'palm' | 'face',
    headline: (row.narrative as Reading | null)?.headline ?? '',
    createdAt: row.created_at as string,
    geometry: geometryFrom(row.feature_sets),
  }));
}
