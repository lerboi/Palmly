// ops-alerts (Backend §12) — secret (cron). Evaluates the §12 alert signals over the recent
// worker_telemetry window and surfaces any breaches. The email/Slack delivery is the parked leg
// (needs a webhook secret + human wiring, H2); for now breaches are returned + written to telemetry
// so they're visible in logs/dashboards. Detection is fully server-side (migration 0017).
import { createContext, requireMode } from '../_shared/context.ts';
import { jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { writeTelemetry } from '../_shared/telemetry.ts';
import { formatAlertLines, type OpsAlert } from '../_shared/ops.ts';

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'secret');

    const { data } = await ctx.admin.rpc('ops_alerts', {});
    const alerts = (data ?? []) as OpsAlert[];
    const lines = formatAlertLines(alerts);

    // TODO (parked, H2/deploy): POST `lines` to the Slack/email incoming webhook when a breach exists.
    await writeTelemetry(ctx.admin, { worker: 'ops-alerts', status: alerts.length ? 'retry' : 'ok', detail: { breaches: alerts.length, alerts } });
    return jsonResponse({ breaches: alerts.length, alerts, lines });
  }),
);
