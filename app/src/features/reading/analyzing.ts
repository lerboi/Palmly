import type { LineGeometry } from '@/components/palm-diagram/geometry';
import type { ScanStatus } from '@/lib/useScanStatus';
import { CANONICAL_DELETION_SHORT } from '@/lib/trustCopy';

/** The analyzing loader's UX stages (UIUX §2.4) — the product visibly working on *their* hand. */
export interface AnalyzingStage {
  line: string | null; // the line being traced (null = the KB / "consulting the classics" stage)
  /** Copy for when the palm on screen really IS theirs (a rescan, so a stored geometry exists). */
  message: string;
  /** Copy for the abstract motif — no possessive, because there is nothing of theirs to trace yet. */
  abstract: string;
}
export const STAGES: AnalyzingStage[] = [
  { line: 'heart_line', message: 'Tracing your heart line…', abstract: 'Tracing the heart line…' },
  { line: 'head_line', message: 'Reading your head line…', abstract: 'Reading the head line…' },
  { line: 'life_line', message: 'Following your life line…', abstract: 'Following the life line…' },
  { line: null, message: 'Consulting the classics…', abstract: 'Consulting the classics…' },
];

/**
 * The stage line, possessive ONLY when it is true (Audit-4 SH-7, Direction §4.5).
 *
 * The loader traces `PREVIEW_GEOMETRY` — a fixture — while telling the user "Tracing **your** heart
 * line…" and labelling it "Your palm line diagram". The user's real geometry does not exist until
 * extraction finishes, so for a first scan every one of those words is false. On a rescan a stored
 * geometry DOES exist, the route passes it, and the possessive becomes honest.
 */
export function stageMessage(stage: number, ownGeometry: boolean): string {
  const s = STAGES[Math.min(Math.max(stage, 0), STAGES.length - 1)];
  return ownGeometry ? s.message : s.abstract;
}

/** The a11y label for the traced hero — never claims the fixture is the reader's own hand (SH-7). */
export const ABSTRACT_PALM_LABEL = 'Palm illustration';

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

// ── The progress ring (Audit-4 CO-13) ─────────────────────────────────────────────────────────────

/** Ring stroke weights. The glow is the wide one — and the reason the viewport needs padding. */
export const RING_TRACK_WIDTH = 5;
export const RING_GLOW_WIDTH = 14;

export interface RingGeometry {
  /** The SVG viewport (square) — the ring's box PLUS room for the glow's outer half. */
  size: number;
  cx: number;
  cy: number;
  r: number;
  circumference: number;
}

/**
 * The ring around the traced palm, sized so the breathing glow **cannot clip** (CO-13).
 *
 * It used to draw at `r = size/2 - 6` with a 14-wide glow, putting the glow's outer edge 1px
 * outside its own SVG viewport — so the soft halo was sliced flat on all four sides, which reads as
 * a rendering bug rather than a glow. The viewport is now padded by the glow's half-width; the
 * visible ring keeps its diameter, so nothing else moves.
 */
export function ringGeometry(diagramSize: number): RingGeometry {
  const ring = diagramSize + 56; // the visible ring's diameter — unchanged
  const size = ring + RING_GLOW_WIDTH; // half the glow width of padding on every side
  const r = ring / 2 - RING_TRACK_WIDTH / 2;
  return { size, cx: size / 2, cy: size / 2, r, circumference: 2 * Math.PI * r };
}

/** Where the ring parks vs. where it creeps to while extraction runs long (CO-13). */
export const CREEP_FROM = 0.75;
export const CREEP_TO = 0.92;
const CREEP_TAU_MS = 20_000;

/**
 * The ring's fraction for a stage (CO-13, Direction §4.5).
 *
 * The old value was `(stage + 1) / STAGES.length`, and `stageFor` caps at stage 2 during
 * extraction — so the ring hit 75% and **parked there** for the entire slowest stretch of the
 * pipeline, which is exactly when a user starts to wonder whether the app has hung. The last
 * extraction stage now creeps asymptotically toward 92%: always moving, never arriving, and never
 * pretending to be finished. The narrative stage completes it.
 */
export function analyzingProgress(stage: number, elapsedMs: number): number {
  const last = STAGES.length - 1;
  if (stage >= last) return 1;
  if (stage < last - 1) return (stage + 1) / STAGES.length;
  // Time spent inside the final extraction stage — the stretch the old ring sat still for.
  const inStage = Math.max(0, elapsedMs - (last - 1) * STAGE_MS);
  return CREEP_FROM + (CREEP_TO - CREEP_FROM) * (1 - Math.exp(-inStage / CREEP_TAU_MS));
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
/**
 * Warm, specific hint keyed on the pipeline's **real** failure_reason vocabulary
 * (`supabase/functions/_shared/extraction.ts`): `not_a_hand`, `not_a_face`,
 * `gemini_finish_<reason>` (prefix), `invalid_json`, `schema_invalid`. Anything the pipeline can't
 * emit falls back to the warm lighting line — we never invent reasons like "blur"/"dark".
 */
export function failureHint(reason: string | null | undefined): string {
  if (!reason) return FAILURE_DEFAULT;
  if (reason.includes('not_a_hand')) return 'That didn’t look like a palm — frame your hand in the guide and try again.';
  if (reason.includes('not_a_face')) return 'That didn’t look like a face — center your face in the guide and try again.';
  if (reason.startsWith('gemini_finish_')) return 'Something interrupted the reading — give it another try.';
  if (reason === 'invalid_json' || reason === 'schema_invalid') return 'The reading came back unclear — one more try should do it.';
  return FAILURE_DEFAULT;
}

/** One rotating social-proof line beneath the stage message. Honest pre-launch phrasing only — no
 *  fabricated counts (the old "1.2M palms read" is gone); authority framed without ethnicity
 *  (redesign §2/§6): "rooted in centuries", not "3000 years of Chinese palmistry". */
export const SOCIAL_PROOF = [
  'Read from your lines, not your birthday',
  'Rooted in centuries of palmistry',
  CANONICAL_DELETION_SHORT,
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
