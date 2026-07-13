import { assert, assertEquals } from '@std/assert';
import { formatAlertLines, type OpsAlert } from './ops.ts';

Deno.test('formatAlertLines: formats each alert kind in its natural unit', () => {
  const alerts: OpsAlert[] = [
    { alert: 'queue_age_p95', scope: 'scan_jobs', metric: 72000, threshold: 60000, detail: '25 samples on scan_jobs' },
    { alert: 'failure_rate', scope: 'worker-scan', metric: 0.12, threshold: 0.05 },
    { alert: 'cache_hit_ratio', scope: 'worker-narrative', metric: 0.4, threshold: 0.8 },
    { alert: 'spend_anomaly', scope: 'global', metric: 12.5, threshold: 3.0 },
  ];
  const lines = formatAlertLines(alerts);
  assertEquals(lines.length, 4);
  assert(lines[0].includes('72.0s') && lines[0].includes('60.0s') && lines[0].includes('25 samples'));
  assert(lines[1].includes('12.0%') && lines[1].includes('5.0%') && lines[1].includes('worker-scan'));
  assert(lines[2].includes('40.0%') && lines[2].includes('80.0%'));
  assert(lines[3].includes('$12.50/h') && lines[3].includes('$3.00/h'));
});

Deno.test('formatAlertLines: empty in → empty out', () => {
  assertEquals(formatAlertLines([]), []);
});
