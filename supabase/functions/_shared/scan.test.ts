import { assertEquals, assertRejects, assertThrows } from '@std/assert';
import { AppError } from './http.ts';
import { createScan, ingestScan, parseScanCreateInput, scanStoragePath } from './scan.ts';

// ── parseScanCreateInput ─────────────────────────────────────────────────────────────────────────

Deno.test('parseScanCreateInput: palm carries the hand answer through to `side`', () => {
  assertEquals(parseScanCreateInput({ kind: 'palm', hand: 'left' }), { kind: 'palm', side: 'left', captureMeta: null });
  assertEquals(parseScanCreateInput({ kind: 'palm', hand: 'right' }), { kind: 'palm', side: 'right', captureMeta: null });
  // `side` is accepted as an alias for `hand`
  assertEquals(parseScanCreateInput({ kind: 'palm', side: 'left' }), { kind: 'palm', side: 'left', captureMeta: null });
});

Deno.test('parseScanCreateInput: face has no side', () => {
  assertEquals(parseScanCreateInput({ kind: 'face' }), { kind: 'face', side: null, captureMeta: null });
  // a stray hand on a face scan is ignored, not an error
  assertEquals(parseScanCreateInput({ kind: 'face', hand: 'left' }), { kind: 'face', side: null, captureMeta: null });
});

Deno.test('parseScanCreateInput: capture_meta (P4.T3) passes through when it is a sane object', () => {
  const meta = { cv: 'cv1', source: 'camera', quality: { bbox: 0.42 } };
  assertEquals(parseScanCreateInput({ kind: 'palm', hand: 'left', capture_meta: meta }).captureMeta, meta);
  assertEquals(parseScanCreateInput({ kind: 'face', capture_meta: meta }).captureMeta, meta);
});

Deno.test('parseScanCreateInput: junk capture_meta is DROPPED, never an error (telemetry must not block a scan)', () => {
  // non-objects / arrays → null
  for (const bad of ['cv1', 42, true, ['cv1'], null]) {
    assertEquals(parseScanCreateInput({ kind: 'palm', hand: 'left', capture_meta: bad }).captureMeta, null);
  }
  // oversized (> 2 KB serialized) → null
  const oversized = { blob: 'x'.repeat(3000) };
  assertEquals(parseScanCreateInput({ kind: 'palm', hand: 'left', capture_meta: oversized }).captureMeta, null);
});

Deno.test('parseScanCreateInput: a palm scan REQUIRES a valid hand — no silent default to right', () => {
  for (const body of [{ kind: 'palm' }, { kind: 'palm', hand: 'sideways' }, { kind: 'palm', hand: '' }]) {
    assertThrows(() => parseScanCreateInput(body), AppError, 'requires hand');
  }
});

Deno.test('parseScanCreateInput: an unknown/absent kind is rejected', () => {
  for (const body of [{}, { kind: 'foot' }, { kind: 'palm ' }, null]) {
    assertThrows(() => parseScanCreateInput(body), AppError, 'kind');
  }
});

Deno.test('scanStoragePath: owner-prefixed convention (migration 0003 segment [1])', () => {
  assertEquals(scanStoragePath('user-1', 'scan-9'), 'user-1/scan-9.jpg');
});

// ── createScan ───────────────────────────────────────────────────────────────────────────────────

Deno.test('createScan: happy path runs quota → insert → sign, returns id + upload url', async () => {
  const calls: string[] = [];
  let insertedRow: Record<string, unknown> | null = null;
  const result = await createScan({
    userId: 'u1',
    input: { kind: 'palm', side: 'left', captureMeta: { cv: 'cv1', source: 'camera' } },
    newId: () => 'scan-fixed',
    checkQuota: () => {
      calls.push('quota');
      return Promise.resolve();
    },
    insertScan: (row) => {
      calls.push('insert');
      insertedRow = row;
      return Promise.resolve({ error: null });
    },
    createSignedUpload: (path) => {
      calls.push(`sign:${path}`);
      return Promise.resolve({ data: { signedUrl: `https://x/upload/${path}?token=tok`, token: 'tok' }, error: null });
    },
  });
  assertEquals(calls, ['quota', 'insert', 'sign:u1/scan-fixed.jpg']);
  assertEquals(result, {
    scanId: 'scan-fixed',
    storagePath: 'u1/scan-fixed.jpg',
    uploadUrl: 'https://x/upload/u1/scan-fixed.jpg?token=tok',
    uploadToken: 'tok',
  });
  // the row carries the mapped side + owner path + the pre-ingest status + the P4.T3 cv stamp
  assertEquals(insertedRow, {
    id: 'scan-fixed',
    user_id: 'u1',
    kind: 'palm',
    side: 'left',
    status: 'uploaded',
    storage_path: 'u1/scan-fixed.jpg',
    capture_meta: { cv: 'cv1', source: 'camera' },
  });
});

Deno.test('createScan: absent captureMeta inserts the column default shape ({})', async () => {
  let insertedRow: Record<string, unknown> | null = null;
  await createScan({
    userId: 'u1',
    input: { kind: 'face', side: null, captureMeta: null },
    newId: () => 'scan-f',
    checkQuota: () => Promise.resolve(),
    insertScan: (row) => {
      insertedRow = row;
      return Promise.resolve({ error: null });
    },
    createSignedUpload: (path) => Promise.resolve({ data: { signedUrl: `https://x/${path}`, token: 't' }, error: null }),
  });
  assertEquals((insertedRow as Record<string, unknown> | null)?.capture_meta, {});
});

Deno.test('createScan: quota refusal happens BEFORE any row is written', async () => {
  let inserted = false;
  await assertRejects(
    () =>
      createScan({
        userId: 'u1',
        input: { kind: 'palm', side: 'right', captureMeta: null },
        newId: () => 'scan-x',
        checkQuota: () => Promise.reject(new AppError('rate_limited', 'too many', 429)),
        insertScan: () => {
          inserted = true;
          return Promise.resolve({ error: null });
        },
        createSignedUpload: () => Promise.resolve({ data: { signedUrl: 'x', token: 't' }, error: null }),
      }),
    AppError,
    'too many',
  );
  assertEquals(inserted, false, 'a quota-refused caller must never consume a scans row');
});

Deno.test('createScan: an insert failure surfaces and does not mint an upload url', async () => {
  let signed = false;
  await assertRejects(
    () =>
      createScan({
        userId: 'u1',
        input: { kind: 'face', side: null, captureMeta: null },
        newId: () => 'scan-x',
        checkQuota: () => Promise.resolve(),
        insertScan: () => Promise.resolve({ error: { message: 'fk violation' } }),
        createSignedUpload: () => {
          signed = true;
          return Promise.resolve({ data: { signedUrl: 'x', token: 't' }, error: null });
        },
      }),
    AppError,
    'scan insert failed',
  );
  assertEquals(signed, false);
});

// ── ingestScan ───────────────────────────────────────────────────────────────────────────────────

const baseIngest = (over: Partial<Parameters<typeof ingestScan>[0]> = {}) => ({
  userId: 'u1',
  scanId: 's1',
  loadScan: () => Promise.resolve({ data: { user_id: 'u1', status: 'uploaded', storage_path: 'u1/s1.jpg' }, error: null }),
  objectExists: () => Promise.resolve(true),
  claimForQueue: () => Promise.resolve({ won: true, error: null }),
  enqueue: () => Promise.resolve({ error: null }),
  releaseClaim: () => Promise.resolve({ error: null }),
  ...over,
});

Deno.test('ingestScan: happy path checks the object THEN claims THEN enqueues', async () => {
  const calls: string[] = [];
  const r = await ingestScan(
    baseIngest({
      objectExists: () => {
        calls.push('exists');
        return Promise.resolve(true);
      },
      claimForQueue: () => {
        calls.push('claim');
        return Promise.resolve({ won: true, error: null });
      },
      enqueue: () => {
        calls.push('enqueue');
        return Promise.resolve({ error: null });
      },
    }),
  );
  assertEquals(r, { queued: true });
  assertEquals(calls, ['exists', 'claim', 'enqueue']);
});

Deno.test('ingestScan: a concurrent loser (claim not won) returns already and NEVER enqueues', async () => {
  // The dedup gate: object exists and status read as 'uploaded', but a racing ingest already flipped
  // it — this call must not push a second scan_jobs message (the duplicate-paid-extraction defect).
  let enqueued = false;
  const r = await ingestScan(
    baseIngest({
      claimForQueue: () => Promise.resolve({ won: false, error: null }),
      enqueue: () => {
        enqueued = true;
        return Promise.resolve({ error: null });
      },
    }),
  );
  assertEquals(r, { queued: true, already: true });
  assertEquals(enqueued, false, 'only the claim winner may enqueue — a loser must not double-enqueue');
});

Deno.test('ingestScan: an enqueue failure AFTER winning the claim compensates (releases) and throws', async () => {
  let released = false;
  await assertRejects(
    () =>
      ingestScan(
        baseIngest({
          claimForQueue: () => Promise.resolve({ won: true, error: null }),
          enqueue: () => Promise.resolve({ error: { message: 'pgmq down' } }),
          releaseClaim: () => {
            released = true;
            return Promise.resolve({ error: null });
          },
        }),
      ),
    AppError,
    'enqueue failed',
  );
  assertEquals(released, true, 'a failed enqueue must revert the claim so a retry can re-win it');
});

Deno.test('ingestScan: a missing object is a 409 and NEVER claims or enqueues', async () => {
  let claimed = false;
  let enqueued = false;
  await assertRejects(
    () =>
      ingestScan(
        baseIngest({
          objectExists: () => Promise.resolve(false),
          claimForQueue: () => {
            claimed = true;
            return Promise.resolve({ won: true, error: null });
          },
          enqueue: () => {
            enqueued = true;
            return Promise.resolve({ error: null });
          },
        }),
      ),
    AppError,
    'upload not found',
  );
  assertEquals([claimed, enqueued], [false, false], 'a missing object must not consume the claim or enqueue');
});

Deno.test('ingestScan: a foreign scan is a 404 (ownership gate) and claims nothing', async () => {
  let claimed = false;
  await assertRejects(
    () =>
      ingestScan(
        baseIngest({
          loadScan: () => Promise.resolve({ data: { user_id: 'someone-else', status: 'uploaded', storage_path: 'x/s1.jpg' }, error: null }),
          claimForQueue: () => {
            claimed = true;
            return Promise.resolve({ won: true, error: null });
          },
        }),
      ),
    AppError,
    'no such scan',
  );
  assertEquals(claimed, false);
});

Deno.test('ingestScan: an absent scan is a 404 (does not distinguish from not-owned)', async () => {
  await assertRejects(
    () => ingestScan(baseIngest({ loadScan: () => Promise.resolve({ data: null, error: null }) })),
    AppError,
    'no such scan',
  );
});

Deno.test('ingestScan: idempotent — a scan past `uploaded` returns already, no claim, no message', async () => {
  for (const status of ['queued', 'extracting', 'narrating', 'complete', 'matched', 'failed']) {
    let claimed = false;
    const r = await ingestScan(
      baseIngest({
        loadScan: () => Promise.resolve({ data: { user_id: 'u1', status, storage_path: 'u1/s1.jpg' }, error: null }),
        claimForQueue: () => {
          claimed = true;
          return Promise.resolve({ won: true, error: null });
        },
      }),
    );
    assertEquals(r, { queued: true, already: true }, `status ${status} must be idempotent`);
    assertEquals(claimed, false, `status ${status} must not attempt a claim`);
  }
});
