import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { PREVIEW_GEOMETRY } from './reveal';

/** A row in the readings shelf (UIUX §2.11 — palm/face cards, re-openable). */
export interface ReadingSummary {
  id: string;
  kind: 'palm' | 'face';
  headline: string;
  createdAt: string; // ISO
  geometry: LineGeometry;
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
  // `undefined` locale → the device/runtime default (device locale on native), not a hardcoded en-US.
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Preview shelf for device-free web-screenshot verification (P6.T4). ──
const FACE_GEOMETRY: LineGeometry = {
  heart_line: [
    [200, 380],
    [500, 360],
    [800, 380],
  ],
  head_line: [
    [220, 520],
    [520, 540],
    [800, 560],
  ],
};

export const PREVIEW_HISTORY: ReadingSummary[] = [
  { id: 'r1', kind: 'palm', headline: 'A Water hand — feeling runs deep in you.', createdAt: '2026-07-14T02:00:00Z', geometry: PREVIEW_GEOMETRY },
  { id: 'r2', kind: 'face', headline: 'Balanced three courts — steady judgement.', createdAt: '2026-07-13T02:00:00Z', geometry: FACE_GEOMETRY },
  { id: 'r3', kind: 'palm', headline: 'A long fate line — a path you set yourself.', createdAt: '2026-07-08T02:00:00Z', geometry: PREVIEW_GEOMETRY },
];
