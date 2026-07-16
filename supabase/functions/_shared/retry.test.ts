import { assert, assertEquals } from '@std/assert';
import { alreadyProcessed, classifyFailure, decideFailure, decideSuccess, exhausted, MAX_ATTEMPTS } from './retry.ts';

Deno.test('classifyFailure: content/validation → permanent, infra/model-availability → transient', () => {
  for (const r of ['not_a_hand', 'not_a_face', 'schema_invalid', 'invalid_json', 'no_sections', 'content_safety']) {
    assertEquals(classifyFailure(r), 'permanent', r);
  }
  for (const r of ['gemini_unavailable', 'image_unavailable', 'store_failed', 'gemini_finish_max_tokens', 'timeout']) {
    assertEquals(classifyFailure(r), 'transient', r);
  }
});

Deno.test('decideFailure: permanent failure on first read → fail fast (archive + status failed)', () => {
  const o = decideFailure('not_a_hand', 1);
  assertEquals(o.action, 'archive');
  assertEquals(o.scanStatus, 'failed');
  assertEquals(o.failureReason, 'not_a_hand');
  assertEquals(o.telemetry, 'failed');
});

Deno.test('decideFailure: transient failure within the attempt budget → retry (leave message)', () => {
  for (let readCt = 1; readCt <= MAX_ATTEMPTS; readCt++) {
    const o = decideFailure('gemini_unavailable', readCt);
    assertEquals(o.action, 'retry', `read_ct=${readCt}`);
    assertEquals(o.scanStatus, undefined, 'status untouched on retry');
    assertEquals(o.telemetry, 'retry');
  }
});

Deno.test('decideFailure: past the attempt budget → dead-letter (archive + failed max_retries)', () => {
  const o = decideFailure('gemini_unavailable', MAX_ATTEMPTS + 1);
  assertEquals(o.action, 'dead_letter');
  assertEquals(o.scanStatus, 'failed');
  assertEquals(o.failureReason, 'max_retries');
});

Deno.test('decideFailure: a poison message (permanent reason) past the budget still dead-letters', () => {
  // read_ct guard wins over the permanent/transient distinction once retries are exhausted.
  const o = decideFailure('schema_invalid', MAX_ATTEMPTS + 5);
  assertEquals(o.action, 'dead_letter');
  assertEquals(o.failureReason, 'max_retries');
});

Deno.test('exhausted() flips exactly after MAX_ATTEMPTS reads', () => {
  assert(!exhausted(MAX_ATTEMPTS));
  assert(exhausted(MAX_ATTEMPTS + 1));
});

Deno.test('decideSuccess archives with ok telemetry', () => {
  assertEquals(decideSuccess(), { action: 'archive', telemetry: 'ok' });
});

Deno.test('alreadyProcessed: a redelivered scan is never regressed out of a post-extraction state (H2)', () => {
  // worker-scan inserts the subject_profile before archiving, so a re-run would MATCH the subject
  // this scan just created and set status back to 'matched' — regressing a narrating/complete scan,
  // broadcasting that regression, and duplicating the narrative job.
  for (const s of ['matched', 'narrating', 'complete', 'failed']) {
    assert(alreadyProcessed(s), `'${s}' is past extraction — a redelivery must settle, not re-extract`);
  }
  // ...but a scan that never got through extraction MUST still be retried. 'extracting' is the one
  // that matters: a worker crashing mid-extraction leaves it there, and excluding it would strand
  // the scan forever.
  for (const s of ['uploaded', 'queued', 'extracting']) {
    assert(!alreadyProcessed(s), `'${s}' has not completed extraction — it must remain retryable`);
  }
});
