// telemetry.ts — the worker telemetry writer (audit §3.3: untested `_shared`).
//
// 22 lines, one promise, and the promise is the whole point: "Best-effort — a telemetry failure must
// never fail the job". Every worker awaits this on its success AND failure paths, so if it ever
// threw, a telemetry outage would become a pipeline outage — and the retry machinery would treat a
// perfectly good scan as a failed one. That contract is what this pins.
import { assertEquals } from '@std/assert';
import type { SupabaseClient } from '@supabase/supabase-js';
import { writeTelemetry } from './telemetry.ts';

interface Captured {
  table: string;
  row: Record<string, unknown>;
}

/** A fake just deep enough for `admin.from(t).insert(r)` — no network, no DB. */
function fakeAdmin(result: { error: { message: string } | null } = { error: null }) {
  const calls: Captured[] = [];
  const client = {
    from(table: string) {
      return {
        insert(row: Record<string, unknown>) {
          calls.push({ table, row });
          return Promise.resolve(result);
        },
      };
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

/** Swallow console.error so a deliberately-failing write does not look like a broken test run. */
async function quietly<T>(fn: () => Promise<T>): Promise<{ result: T; logged: unknown[][] }> {
  const original = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => void logged.push(args);
  try {
    return { result: await fn(), logged };
  } finally {
    console.error = original;
  }
}

Deno.test('writeTelemetry: writes the row to worker_telemetry and defaults status to ok', async () => {
  const { client, calls } = fakeAdmin();
  await writeTelemetry(client, { worker: 'worker-scan', queue: 'scan_jobs', msg_id: 7, queue_age_ms: 120 });

  assertEquals(calls.length, 1);
  assertEquals(calls[0].table, 'worker_telemetry');
  assertEquals(calls[0].row, {
    status: 'ok', // supplied by the writer, not the caller — the happy path is the default
    worker: 'worker-scan',
    queue: 'scan_jobs',
    msg_id: 7,
    queue_age_ms: 120,
  });
});

Deno.test('writeTelemetry: an explicit status overrides the ok default', async () => {
  // `{ status: 'ok', ...row }` — spread order decides this, and it is the difference between a
  // failure being recorded as a failure and being recorded as a success. ops_alerts reads this column.
  const { client, calls } = fakeAdmin();
  await writeTelemetry(client, { worker: 'worker-narrative', status: 'failed', detail: { failure: 'gemini_timeout' } });
  assertEquals(calls[0].row.status, 'failed');
  assertEquals(calls[0].row.detail, { failure: 'gemini_timeout' });

  await writeTelemetry(client, { worker: 'worker-compat', status: 'retry' });
  assertEquals(calls[1].row.status, 'retry');
});

Deno.test('writeTelemetry: a DB error is LOGGED, never thrown — telemetry cannot fail the job', async () => {
  // The contract. A worker awaits this after doing real work; throwing here would unwind a
  // successful pipeline run and hand it back to the retry machinery as if the work had failed.
  const { client } = fakeAdmin({ error: { message: 'relation "worker_telemetry" does not exist' } });
  const { logged } = await quietly(() => writeTelemetry(client, { worker: 'cleanup' }));

  assertEquals(logged.length, 1, 'the failure is surfaced to the logs rather than swallowed silently');
  assertEquals(logged[0][0], '[telemetry] write failed:');
  assertEquals(logged[0][1], 'relation "worker_telemetry" does not exist');
});

Deno.test('writeTelemetry: a THROWING client still fails the job — a stated limit, not a claim', async () => {
  // Honest about the boundary: the writer handles the `{ error }` result shape, which is how
  // supabase-js reports a rejected insert. It does NOT wrap the call in try/catch, so a client that
  // throws outright (e.g. a DNS failure inside fetch) propagates. This test documents the real
  // behaviour rather than asserting a robustness the code does not have.
  const client = {
    from() {
      return { insert: () => Promise.reject(new Error('network down')) };
    },
  } as unknown as SupabaseClient;

  let threw: string | null = null;
  try {
    await writeTelemetry(client, { worker: 'push-dispatch' });
  } catch (e) {
    threw = e instanceof Error ? e.message : String(e);
  }
  assertEquals(threw, 'network down', 'documented: a throwing client is NOT caught here');
});
