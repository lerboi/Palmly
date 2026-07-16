// Worker failure/retry policy (Backend §6.6). pgmq gives each message a `read_ct` (incremented on
// every read); a worker that does NOT archive a message lets pgmq re-deliver it after the
// visibility timeout — that is the retry. This module decides, given a failure reason and the
// current read_ct, whether to fail fast (archive), retry (leave the message), or dead-letter.
//
// Layering: transient Gemini 429/5xx are first absorbed *within* a call by gemini.ts `withRetry`
// (exponential backoff, no read_ct cost — "without burning an attempt", §6.6). Only if Gemini
// stays unavailable past that does the reason bubble up here as a transient failure → retry via vt
// → after MAX_ATTEMPTS reads, dead-letter.

export const MAX_ATTEMPTS = 3;

// Reasons where retrying cannot help — the input or output is definitively bad. Fail fast so we
// don't waste 3 visibility-timeout cycles on a non-hand photo or malformed model output.
const PERMANENT_FAILURES: ReadonlySet<string> = new Set([
  'not_a_hand',
  'not_a_face',
  'schema_invalid',
  'invalid_json',
  'no_sections',
  'content_safety',
  'missing_scan',
  'missing_feature_set',
]);

export type FailureClass = 'permanent' | 'transient';
export const classifyFailure = (reason: string): FailureClass =>
  PERMANENT_FAILURES.has(reason) ? 'permanent' : 'transient';

export type QueueAction = 'archive' | 'retry' | 'dead_letter';
export type TelemetryStatus = 'ok' | 'failed' | 'retry';

export interface Outcome {
  action: QueueAction; // archive → remove from queue; retry → leave for vt redelivery; dead_letter → archive + give up
  scanStatus?: 'failed' | 'complete'; // scans.status to set (undefined = leave as-is, e.g. on retry)
  failureReason?: string;
  telemetry: TelemetryStatus;
}

/**
 * Decide what to do with a failed message. `readCt` is the pgmq read count for THIS delivery
 * (1 on first read). Once it exceeds MAX_ATTEMPTS the message has already been retried enough
 * (or is a poison message that keeps crashing the worker) → dead-letter it.
 */
export function decideFailure(reason: string, readCt: number): Outcome {
  if (readCt > MAX_ATTEMPTS) {
    return { action: 'dead_letter', scanStatus: 'failed', failureReason: 'max_retries', telemetry: 'failed' };
  }
  if (classifyFailure(reason) === 'permanent') {
    return { action: 'archive', scanStatus: 'failed', failureReason: reason, telemetry: 'failed' };
  }
  // transient: don't burn the attempt — leave the message; pgmq re-delivers after the vt.
  return { action: 'retry', telemetry: 'retry' };
}

export const decideSuccess = (): Outcome => ({ action: 'archive', telemetry: 'ok' });

/** True when a just-read message should be dead-lettered before we even try to process it again. */
export const exhausted = (readCt: number): boolean => readCt > MAX_ATTEMPTS;

/**
 * Scan states the pipeline has already moved past. A redelivered `scan_jobs` message for one of
 * these must settle (archive only) and never re-extract (audit H2): worker-scan inserts the
 * subject_profile before archiving, so a re-run would match the subject THIS scan just created and
 * set status back to 'matched' — regressing a 'narrating'/'complete' scan, broadcasting that
 * regression to the client, and duplicating the narrative job.
 *
 * 'extracting' is deliberately NOT here: a worker that crashed mid-extraction leaves the scan there,
 * and that job must still be retried. 'uploaded'/'queued' are pre-work states.
 */
const PROCESSED_STATES = new Set(['matched', 'narrating', 'complete', 'failed']);
export const alreadyProcessed = (status: string): boolean => PROCESSED_STATES.has(status);
