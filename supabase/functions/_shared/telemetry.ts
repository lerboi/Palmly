// Worker telemetry writer (Backend §12/§14). Best-effort — a telemetry failure must never fail
// the job, so errors are logged, not thrown.
import type { SupabaseClient } from '@supabase/supabase-js';

export interface TelemetryRow {
  worker: string;
  queue?: string;
  msg_id?: number;
  status?: 'ok' | 'failed' | 'retry';
  queue_age_ms?: number;
  model_latency_ms?: number;
  tokens_in?: number;
  tokens_out?: number;
  cache_hit?: boolean;
  cost_usd?: number;
  detail?: Record<string, unknown>;
}

export async function writeTelemetry(admin: SupabaseClient, row: TelemetryRow): Promise<void> {
  const { error } = await admin.from('worker_telemetry').insert({ status: 'ok', ...row });
  if (error) console.error('[telemetry] write failed:', error.message);
}
