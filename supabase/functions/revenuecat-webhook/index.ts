// revenuecat-webhook (Backend §4, §5.2, §13) — auth: none + HMAC (one of only two unauthenticated
// surfaces). RevenueCat POSTs subscription lifecycle events; we verify the HMAC-SHA256 signature,
// derive the authoritative entitlement state, and persist it idempotently (record_rc_event). The
// `subscriptions` table it writes is the server-side gate's source of truth (hasPremium).
import { createContext } from '../_shared/context.ts';
import { AppError, jsonResponse, withErrorEnvelope } from '../_shared/http.ts';
import { deriveEntitlement, isUuid, verifyWebhookSignature, type RcEvent } from '../_shared/revenuecat.ts';

Deno.serve(
  withErrorEnvelope(async (req) => {
    const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
    if (!secret) throw new AppError('config_error', 'missing REVENUECAT_WEBHOOK_SECRET', 500);

    // read the RAW body (the HMAC is over the exact bytes — never re-serialize before verifying)
    const raw = await req.text();
    const verdict = await verifyWebhookSignature(raw, req.headers.get('X-RevenueCat-Webhook-Signature'), secret, Date.now());
    if (!verdict.valid) throw new AppError('unauthorized', `webhook signature invalid: ${verdict.reason}`, 401);

    let body: { event?: RcEvent };
    try {
      body = JSON.parse(raw);
    } catch {
      throw new AppError('bad_request', 'body is not valid JSON', 400);
    }
    const event = body.event ?? {};
    if (!event.id) throw new AppError('bad_request', 'missing event.id', 400);

    // appUserID is set to the Supabase UUID at RC configure time (§5.2); guard against RC anon ids.
    const userId = isUuid(event.app_user_id) ? event.app_user_id : null;
    const state = deriveEntitlement(event, Date.now());

    const ctx = createContext(req); // mode 'none' → ctx.admin is the service-role client
    const { data: applied, error } = await ctx.admin.rpc('record_rc_event', {
      p_rc_event_id: event.id,
      p_user_id: userId,
      p_type: event.type ?? 'UNKNOWN',
      p_payload: event,
      p_rc_app_user_id: event.app_user_id ?? '',
      p_status: state.status,
      p_entitlements: state.entitlements,
    });
    if (error) throw new AppError('rc_event_failed', error.message, 500);

    return jsonResponse({ received: true, applied, status: state.status });
  }),
);
