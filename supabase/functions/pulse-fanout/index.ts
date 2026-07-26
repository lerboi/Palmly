// pulse-fanout (Audit-5 · 03 §5) — secret (cron-invoked every 15 min). **The missing C.10 daily
// producer**: the piece that turns Today's Line into a habit loop rather than a page users have to
// remember to visit.
//
// Every quarter hour it selects the devices whose LOCAL clock reads 08:30–08:44, computes each
// user's own feature for their own local date, and enqueues one push naming that feature. It is a
// producer only — dedupe, the hard 1/day marketing cap, quiet hours, Expo batching and dead-token
// pruning all already exist downstream and are already tested (`enqueue_push_deduped`,
// `push-dispatch`). Adding a second path around them is exactly what migration 0029 dropped
// `enqueue_push` to prevent.
//
// Staged rollout (03 §11): `PULSE_FANOUT_ALLOWLIST` (comma-separated user ids) limits the send to
// internal devices until the loop has been observed end-to-end. Unset = everyone.
import { type SupabaseClient } from '@supabase/supabase-js';
import { createContext, requireMode } from '../_shared/context.ts';
import { jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { renderNotification } from '../_shared/notif-templates.ts';
import { planBatch, winbackDue, type FanoutDevice } from '../_shared/pulse-fanout.ts';
import type { SubjectKind } from '../_shared/pulse.ts';
import { writeTelemetry } from '../_shared/telemetry.ts';

/** Devices are scanned in chunks so one tick cannot page an unbounded table into memory. */
const CHUNK = 500;
/** Wall-clock budget per invocation, well inside the 15-minute cadence. */
const BUDGET_MS = 20_000;

interface Tally {
  scanned: number;
  planned: number;
  enqueued: number;
  suppressed: number;
  winback: number;
}

interface DeviceRow {
  user_id: string;
  timezone: string | null;
}

/**
 * Resolve everything the planner needs about a set of users in THREE queries, not three per user:
 * their locale, their subject kinds (the feature pool), their newest feature hash (the chapter
 * schedule), and whether they have already sealed today.
 */
async function hydrate(admin: SupabaseClient, userIds: string[], today: string): Promise<Map<string, Omit<FanoutDevice, 'user_id' | 'timezone'>>> {
  const [profiles, subjects, sealed, features] = await Promise.all([
    admin.from('profiles').select('id, locale').in('id', userIds),
    admin.from('subject_profiles').select('user_id, kind').in('user_id', userIds),
    // "Already sealed today" is checked against the UTC date ±1 — a device's local today can be
    // either side of the UTC boundary, and a false "not sealed" would push at someone who has
    // already done the thing.
    admin.from('user_fortunes').select('user_id, fortune_date').in('user_id', userIds).not('sealed_at', 'is', null).gte('fortune_date', shiftUtc(today, -1)).lte('fortune_date', shiftUtc(today, 1)),
    admin.from('feature_sets').select('user_id, feature_hash, created_at').in('user_id', userIds).order('created_at', { ascending: false }),
  ]);

  const localeOf = new Map((((profiles.data ?? []) as { id: string; locale: string | null }[]).map((p) => [p.id, p.locale])));
  const kindsOf = new Map<string, SubjectKind[]>();
  for (const s of (subjects.data ?? []) as { user_id: string; kind: SubjectKind }[]) {
    kindsOf.set(s.user_id, [...(kindsOf.get(s.user_id) ?? []), s.kind]);
  }
  const sealedOf = new Set(((sealed.data ?? []) as { user_id: string }[]).map((r) => r.user_id));
  const hashOf = new Map<string, string>();
  for (const f of (features.data ?? []) as { user_id: string; feature_hash: string | null }[]) {
    // Ordered newest-first, so the first hash seen per user is the current one.
    if (f.feature_hash && !hashOf.has(f.user_id)) hashOf.set(f.user_id, f.feature_hash);
  }

  const out = new Map<string, Omit<FanoutDevice, 'user_id' | 'timezone'>>();
  for (const id of userIds) {
    out.set(id, {
      locale: localeOf.get(id) ?? 'en',
      kinds: kindsOf.get(id) ?? [],
      feature_hash: hashOf.get(id) ?? null,
      sealed_today: sealedOf.has(id),
    });
  }
  return out;
}

const shiftUtc = (dateKey: string, delta: number): string =>
  new Date(Date.parse(`${dateKey}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10);

/** The staged-rollout allowlist. Unset → everyone; set → only these user ids. */
function allowlist(): Set<string> | null {
  const raw = Deno.env.get('PULSE_FANOUT_ALLOWLIST')?.trim();
  if (!raw) return null;
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return ids.length ? new Set(ids) : null;
}

Deno.serve(
  withErrorEnvelope(async (req) => {
    const ctx = createContext(req);
    requireMode(ctx, 'secret'); // internal only — cron invokes with the service key
    const started = Date.now();
    const now = new Date();
    const todayUtc = now.toISOString().slice(0, 10);
    const allow = allowlist();
    const tally: Tally = { scanned: 0, planned: 0, enqueued: 0, suppressed: 0, winback: 0 };

    let from = 0;
    for (;;) {
      if (Date.now() - started > BUDGET_MS) break;
      const { data, error } = await ctx.admin
        .from('devices')
        .select('user_id, timezone')
        .not('expo_push_token', 'is', null)
        .range(from, from + CHUNK - 1);
      if (error) throw error;
      const rows = (data ?? []) as DeviceRow[];
      if (!rows.length) break;
      tally.scanned += rows.length;

      const eligible = allow ? rows.filter((r) => allow.has(r.user_id)) : rows;
      if (eligible.length) {
        const hydrated = await hydrate(ctx.admin, [...new Set(eligible.map((r) => r.user_id))], todayUtc);
        const planned = planBatch(
          eligible.map((r) => ({ user_id: r.user_id, timezone: r.timezone, ...hydrated.get(r.user_id)!, kinds: hydrated.get(r.user_id)!.kinds })),
          now,
        );
        tally.planned += planned.length;

        for (const msg of planned) {
          const rendered = renderNotification(
            'daily_pulse',
            { feature_label: msg.feature_label, weekday: msg.weekday, is_boundary: msg.is_boundary },
            msg.locale,
          );
          // `enqueue_push_deduped` returns null when the dedupe key is already spent today or the
          // hard marketing cap has been used — both are normal outcomes, not errors.
          const { data: id } = await ctx.admin.rpc('enqueue_push_deduped', {
            p_user_id: msg.user_id,
            p_type: rendered.type,
            p_title: rendered.title,
            p_body: rendered.body,
            p_deep_link: rendered.deep_link,
            p_data: { feature_key: msg.feature_key },
            p_dedupe_key: rendered.dedupe_key,
            p_cap_class: rendered.cap_class,
          });
          if (id) tally.enqueued++;
          else tally.suppressed++;
        }
      }

      if (rows.length < CHUNK) break;
      from += CHUNK;
    }

    // ── The win-back leg (RF4.T4) ──────────────────────────────────────────────────────────────
    // Small, and deliberately here rather than in its own function: it runs on the same cadence,
    // needs the same admin client, and shares the marketing cap — so a user who got a morning line
    // push does NOT also get a win-back, which is the correct behaviour and comes for free.
    const { data: declines } = await ctx.admin
      .from('profiles')
      .select('id, paywall_declined_at')
      .not('paywall_declined_at', 'is', null)
      .lt('paywall_declined_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
      .limit(200);
    for (const p of ((declines ?? []) as { id: string; paywall_declined_at: string }[])) {
      const { data: sub } = await ctx.admin.from('subscriptions').select('status').eq('user_id', p.id).maybeSingle();
      const premium = (sub as { status?: string } | null)?.status === 'active';
      if (!winbackDue({ user_id: p.id, paywall_declined_at: p.paywall_declined_at, premium }, now)) continue;
      const rendered = renderNotification('winback', {}, 'en');
      const { data: id } = await ctx.admin.rpc('enqueue_push_deduped', {
        p_user_id: p.id,
        p_type: rendered.type,
        p_title: rendered.title,
        p_body: rendered.body,
        p_deep_link: rendered.deep_link,
        p_data: {},
        p_dedupe_key: rendered.dedupe_key,
        p_cap_class: rendered.cap_class,
      });
      if (id) tally.winback++;
    }

    await writeTelemetry(ctx.admin, {
      worker: 'pulse-fanout',
      status: 'ok',
      detail: { ...tally, ms: Date.now() - started, allowlisted: allow ? allow.size : null },
    });
    return jsonResponse(tally);
  }),
);
