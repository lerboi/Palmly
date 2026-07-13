// Ops alert formatting (Backend §12). Pure: turns ops_alerts() rows into human-readable lines for
// the (parked) email/Slack delivery. Kept separate so the message shaping is unit-testable without
// a DB or a webhook.

export interface OpsAlert {
  alert: string;
  scope: string;
  metric: number;
  threshold: number;
  detail?: string;
}

const LABEL: Record<string, string> = {
  queue_age_p95: 'Queue age p95 high',
  failure_rate: 'Failure rate high',
  cache_hit_ratio: 'Cache-hit ratio low',
  spend_anomaly: 'Spend anomaly',
};

/** Format a metric value by alert kind (ms → s, ratios → %, spend → $/h). */
function fmt(alert: string, v: number): string {
  if (alert === 'queue_age_p95') return `${(v / 1000).toFixed(1)}s`;
  if (alert === 'failure_rate' || alert === 'cache_hit_ratio') return `${(v * 100).toFixed(1)}%`;
  if (alert === 'spend_anomaly') return `$${v.toFixed(2)}/h`;
  return String(v);
}

/** One human-readable line per breaching alert (for a Slack/email digest). */
export function formatAlertLines(alerts: OpsAlert[]): string[] {
  return (alerts ?? []).map((a) => {
    const head = `🚨 ${LABEL[a.alert] ?? a.alert} — ${a.scope}: ${fmt(a.alert, a.metric)} (threshold ${fmt(a.alert, a.threshold)})`;
    return a.detail ? `${head} · ${a.detail}` : head;
  });
}
