import type { LineGeometry } from '@/components/palm-diagram/geometry';
import type { ScanStatus } from '@/lib/useScanStatus';

/** The analyzing loader's UX stages (UIUX §2.4) — the product visibly working on *their* hand. */
export interface AnalyzingStage {
  line: string | null; // the line being traced (null = the KB / "consulting the classics" stage)
  message: string;
}
export const STAGES: AnalyzingStage[] = [
  { line: 'heart_line', message: 'Tracing your heart line…' },
  { line: 'head_line', message: 'Reading your head line…' },
  { line: 'life_line', message: 'Following your life line…' },
  { line: null, message: 'Consulting the classics…' },
];

const STAGE_MS = 3500;

/**
 * Map the live scan status + elapsed time to a UX stage (0–3). The line-tracing stages advance on a
 * timer during extraction; once the backend reaches the narrative step it locks to the final
 * "consulting the classics" stage. Terminal states also show the final stage until the reveal loads.
 */
export function stageFor(status: ScanStatus | null, elapsedMs: number): number {
  if (status === 'narrating' || status === 'complete' || status === 'matched') return STAGES.length - 1;
  return Math.min(Math.floor(Math.max(0, elapsedMs) / STAGE_MS), STAGES.length - 2);
}

export type OverrunLevel = 'normal' | 'soft' | 'notify';
/** Overrun handling (UIUX §2.4): soften at 45s, offer notify-me at 75s. */
export function overrunLevel(elapsedMs: number): OverrunLevel {
  if (elapsedMs >= 75_000) return 'notify';
  if (elapsedMs >= 45_000) return 'soft';
  return 'normal';
}

// Copy kept here (typographic ’ avoids JSX-escaping + reads nicer than an ASCII apostrophe).
export const OVERRUN_SOFT = 'Taking a little longer — your lines are worth it.';
export const NOTIFY_COPY = 'We’ll notify you the moment it’s ready.';
export const NOTIFY_CTA = 'Notify me when it’s ready';
export const FAILURE_TITLE = 'We couldn’t see your lines clearly';
export const FAILURE_DEFAULT = 'Let’s try again with a bit more light.';
export function failureHint(reason: string | null | undefined): string {
  if (reason?.includes('not_a_hand')) return 'That didn’t look like a palm — frame your hand in the guide and try again.';
  return FAILURE_DEFAULT;
}

/** One rotating social-proof line beneath the stage message. Authority framed without ethnicity
 *  (redesign §2/§6): "rooted in centuries" / "cross-checking the classics", not "3000 years of
 *  Chinese palmistry". */
export const SOCIAL_PROOF = [
  '1.2M palms read',
  'Rooted in centuries of palmistry',
  'Your photo is deleted after your reading',
];

/** Rotate the social-proof line over time (redesign v2 V12 — the array now actually cycles). */
export const SOCIAL_PROOF_MS = 4000;
export function socialProofAt(elapsedMs: number): string {
  const i = Math.floor(Math.max(0, elapsedMs) / SOCIAL_PROOF_MS) % SOCIAL_PROOF.length;
  return SOCIAL_PROOF[i];
}

/** The lines drawn so far — up to and including the current stage's line (progressive tracing). */
export function visibleGeometry(geometry: LineGeometry, stage: number): LineGeometry {
  const drawn = STAGES.slice(0, stage + 1)
    .map((s) => s.line)
    .filter((l): l is string => l != null);
  const out: LineGeometry = {};
  for (const l of drawn) if (geometry[l]) out[l] = geometry[l];
  return out;
}
