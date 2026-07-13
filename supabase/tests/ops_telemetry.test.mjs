/**
 * P11.T2 (ops telemetry aggregation + alerts) — Backend §12/§14. Transactional / rolled back.
 * Synthetic worker_telemetry rows drive ops_worker_metrics + ops_alerts (migration 0017); we prove
 * each aggregate computes correctly and each §12 alert fires exactly on breach (and stays quiet when
 * healthy or under the min-sample gate). The email/Slack delivery is parked; the formatter is
 * unit-tested in Deno (_shared/ops.test.ts).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations } from './lib/db.mjs';

// Insert `count` telemetry rows for a (worker, queue) with fixed fields, placed `minsAgo` in the past.
const telem = (c, o) =>
  c.query(
    `insert into public.worker_telemetry (worker, queue, status, queue_age_ms, model_latency_ms, cache_hit, cost_usd, created_at)
     select $1,$2,$3,$4,$5,$6,$7, now() - make_interval(mins => $8) from generate_series(1, $9)`,
    [o.worker, o.queue ?? 'q', o.status ?? 'ok', o.qms ?? null, o.mlms ?? null, o.cache ?? null, o.cost ?? 0, Math.round((o.hoursAgo ?? 0) * 60), o.count],
  );

const metrics = async (c, since = '1 hour') => (await c.query(`select * from public.ops_worker_metrics($1::interval)`, [since])).rows;
const alerts = async (c, since = '1 hour') => (await c.query(`select * from public.ops_alerts($1::interval)`, [since])).rows;

test('ops_worker_metrics: p95, failure rate, cache-hit ratio, cost per job', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await telem(c, { worker: 'w', queue: 'qa', count: 20, qms: 10000, cost: 0.01 });
    await telem(c, { worker: 'w', queue: 'qa', count: 5, qms: 70000, cost: 0.01 }); // slow tail
    await telem(c, { worker: 'w', queue: 'qa', count: 3, status: 'failed', qms: 10000 }); // 3 failed of 28
    await telem(c, { worker: 'w', queue: 'qa', count: 12, cache: true, qms: 10000 });
    await telem(c, { worker: 'w', queue: 'qa', count: 8, cache: false, qms: 10000 }); // 12/20 = 0.6

    const m = (await metrics(c)).find((r) => r.queue === 'qa');
    assert.equal(Number(m.samples), 48);
    assert.equal(Number(m.failed), 3);
    assert.equal(Number(m.failure_rate), 0.0625, '3/48');
    assert.ok(Number(m.queue_age_p95_ms) >= 60000, `p95 in the slow tail, got ${m.queue_age_p95_ms}`);
    assert.equal(Number(m.cache_samples), 20);
    assert.equal(Number(m.cache_hit_ratio), 0.6, '12/20 cache hits');
    assert.ok(Number(m.cost_usd) > 0 && Number(m.cost_per_job) > 0);
  });
});

test('ops_alerts: fires exactly the breaching signals, respects the min-sample gate', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    // A: queue p95 breach on q-slow (25 samples, slow tail)
    await telem(c, { worker: 'w-queue', queue: 'q-slow', count: 20, qms: 10000 });
    await telem(c, { worker: 'w-queue', queue: 'q-slow', count: 5, qms: 70000 });
    // B: failure-rate breach on w-fail (3/25 = 12%)
    await telem(c, { worker: 'w-fail', queue: 'q-fail', count: 22, qms: 1000 });
    await telem(c, { worker: 'w-fail', queue: 'q-fail', count: 3, status: 'failed', qms: 1000 });
    // C: cache breach on w-cache (10/25 = 40%)
    await telem(c, { worker: 'w-cache', queue: 'q-cache', count: 10, cache: true, qms: 1000 });
    await telem(c, { worker: 'w-cache', queue: 'q-cache', count: 15, cache: false, qms: 1000 });
    // D: healthy (no breach)
    await telem(c, { worker: 'w-ok', queue: 'q-ok', count: 24, cache: true, qms: 5000 });
    await telem(c, { worker: 'w-ok', queue: 'q-ok', count: 1, cache: false, qms: 5000 });
    // E: below min-sample — 100% failure + high p95 but only 5 rows → must NOT alert
    await telem(c, { worker: 'w-small', queue: 'q-small', count: 5, status: 'failed', qms: 90000 });

    const fired = (await alerts(c)).map((a) => `${a.alert}:${a.scope}`).sort();
    assert.deepEqual(fired, ['cache_hit_ratio:w-cache', 'failure_rate:w-fail', 'queue_age_p95:q-slow'].sort());
  });
});

test('ops_alerts: a healthy window produces no alerts', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await telem(c, { worker: 'w-ok', queue: 'q-ok', count: 30, cache: true, qms: 8000, cost: 0.002 });
    assert.equal((await alerts(c)).length, 0);
  });
});

test('ops_alerts: spend anomaly fires when the recent burn spikes over the 24h baseline', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    // baseline: ~$0.05/h spread across the trailing 24h
    for (let h = 2; h <= 23; h++) await telem(c, { worker: 'w', queue: 'q', count: 1, cost: 0.05, hoursAgo: h });
    // recent spike: $10 in the last hour
    await telem(c, { worker: 'w', queue: 'q', count: 5, cost: 2.0, hoursAgo: 0 });

    const spend = (await alerts(c)).find((a) => a.alert === 'spend_anomaly');
    assert.ok(spend, 'spend anomaly should fire');
    assert.equal(spend.scope, 'global');
    assert.ok(Number(spend.metric) > Number(spend.threshold), 'recent hourly burn exceeds the alert threshold');
  });
});

test('ops functions are service-role only (no client access)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    for (const fn of ['ops_worker_metrics(interval)', 'ops_alerts(interval, int, int, numeric, numeric, numeric, numeric)']) {
      const anon = (await c.query(`select has_function_privilege('authenticated', 'public.${fn}', 'execute') as can`)).rows[0].can;
      assert.equal(anon, false, `authenticated cannot execute ${fn}`);
      const svc = (await c.query(`select has_function_privilege('service_role', 'public.${fn}', 'execute') as can`)).rows[0].can;
      assert.equal(svc, true, `service_role can execute ${fn}`);
    }
  });
});
