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

/** A loaded reading plus the geometry to draw its palm/face and its id/kind. */
export interface LoadedReading {
  id: string;
  kind: 'palm' | 'face';
  reading: Reading;
  geometry: LineGeometry;
  /** When the source photo was deleted (scans.image_deleted_at), else uploaded (created_at) —
   *  powers the reveal's timestamped "Photo deleted · 2:41 PM ✓" trust badge (audit F1.1). */
  photoDeletedAt: string | null;
}

/** Pull `features.line_geometry` out of an embedded feature_sets row (object or one-element array). */
function geometryFrom(featureSets: unknown): LineGeometry {
  const one = Array.isArray(featureSets) ? featureSets[0] : featureSets;
  const features = (one as { features?: Record<string, unknown> } | undefined)?.features;
  const lg = features?.line_geometry;
  return lg && typeof lg === 'object' ? (lg as LineGeometry) : {};
}

/** Pull the source scan's deletion/created timestamp out of the nested `scans` embed. */
function photoTimeFrom(featureSets: unknown): string | null {
  const one = Array.isArray(featureSets) ? featureSets[0] : featureSets;
  const scans = (one as { scans?: unknown } | undefined)?.scans;
  const scan = Array.isArray(scans) ? scans[0] : scans;
  const s = scan as { image_deleted_at?: string | null; created_at?: string | null } | undefined;
  return s?.image_deleted_at ?? s?.created_at ?? null;
}

function toLoaded(row: Record<string, unknown>): LoadedReading {
  return {
    id: row.id as string,
    kind: row.kind as 'palm' | 'face',
    reading: row.narrative as Reading,
    geometry: geometryFrom(row.feature_sets),
    photoDeletedAt: photoTimeFrom(row.feature_sets),
  };
}

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
      .select('id, kind, narrative, feature_sets!inner(features, scans(image_deleted_at, created_at))')
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
    .select('id, kind, narrative, feature_sets!inner(features, scan_id, scans(image_deleted_at, created_at))')
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
    .select('id, kind, narrative, feature_sets!inner(features, side, scans(image_deleted_at, created_at))')
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
