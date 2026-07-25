import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { FACE_READING_ENABLED } from '@/lib/capabilities';
import { deviceLocale } from '@/lib/locale';
import { ABSTRACT_GEOMETRY } from './reveal';

/** A row in the readings shelf (UIUX §2.11 — palm/face cards, re-openable). */
export interface ReadingSummary {
  id: string;
  kind: 'palm' | 'face';
  headline: string;
  createdAt: string; // ISO
  /** The reading's own traced lines. **Absent for face readings** (Audit-4 CO-5): a face has no palm
   *  geometry, and the shelf used to draw an invented one, so a face row looked like a palm row. */
  geometry?: LineGeometry;
}

/**
 * The rows a production shelf may show. While the face reveal content path is gated (audit F1.6,
 * `FACE_READING_ENABLED = false`), face rows are dropped so tapping one can't open a palm-shaped
 * reveal; F1.T7 flips the flag and every kind returns. `faceEnabled` is injected so both branches
 * are unit-testable — production call sites use the build-time default.
 */
export function visibleReadings(rows: ReadingSummary[], faceEnabled: boolean = FACE_READING_ENABLED): ReadingSummary[] {
  return faceEnabled ? rows : rows.filter((r) => r.kind !== 'face');
}

/** A compact relative date ("Today" / "Yesterday" / "3 days ago" / "Mar 4"). `now` is injected so it's testable. */
export function relativeDate(iso: string, now: number): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const days = Math.floor((now - then) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`;
  // Device locale (audit §6) → dates read in the user's own locale, not a hardcoded en-US.
  return new Date(then).toLocaleDateString(deviceLocale(), { month: 'short', day: 'numeric' });
}

// ── Preview shelf for device-free web-screenshot verification (P6.T4). ──

export const PREVIEW_HISTORY: ReadingSummary[] = [
  { id: 'r1', kind: 'palm', headline: 'A Water hand — feeling runs deep in you.', createdAt: '2026-07-14T02:00:00Z', geometry: ABSTRACT_GEOMETRY },
  { id: 'r2', kind: 'face', headline: 'Balanced three courts — steady judgement.', createdAt: '2026-07-13T02:00:00Z' },
  { id: 'r3', kind: 'palm', headline: 'A long fate line — a path you set yourself.', createdAt: '2026-07-08T02:00:00Z', geometry: ABSTRACT_GEOMETRY },
];

/**
 * Read the stored match flag as a KIND (Audit-4 SH-12). Lives here, not in `lib/session`, because
 * that module imports AsyncStorage and cannot be reached from a test — which is how a kind-agnostic
 * flag came to brag "Your palm is unchanged" after a matched FACE scan in the first place.
 *
 * `'1'` is the pre-SH-12 value: a match with no kind recorded, which was always a palm in practice
 * (the face path was flag-gated), so it reads as palm rather than being discarded.
 */
export function parseMatchedKind(raw: string | null): 'palm' | 'face' | null {
  if (raw === 'face') return 'face';
  return raw === 'palm' || raw === '1' ? 'palm' : null;
}
