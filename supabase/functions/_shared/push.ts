// Push notification helpers (Backend §10). Transport is Expo Push (provider-agnostic). Pure/
// injectable pieces — preference + quiet-hours gating, Expo message building, batched send with an
// injectable fetch, and DeviceNotRegistered pruning — so the whole thing is unit-testable without
// hitting Expo. The daily-fortune send is timezone-sharded (8:30 local) upstream; here we just
// respect each device's prefs + quiet hours and prune dead tokens on the receipts.

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
export const EXPO_MAX_BATCH = 100; // Expo accepts ≤100 messages per request

export type PushClass = 'fortune' | 'social' | 'pipeline';

export interface PushJob {
  user_id: string;
  type: string; // 'daily_fortune' | 'reading_ready' | 'compat_complete' | 'invite_accepted' | ...
  title: string;
  body: string;
  deep_link?: string;
  data?: Record<string, unknown>;
}

export interface DeviceRow {
  expo_push_token: string | null;
  notif_prefs: { daily_fortune?: boolean; social?: boolean } | null;
  timezone?: string | null;
}

// Notification class per type → which preference gates it. Pipeline (reading ready) is high-intent
// and always sent; fortune respects `daily_fortune`; everything social respects `social`.
const CLASS_OF: Record<string, PushClass> = {
  daily_fortune: 'fortune',
  solar_term: 'fortune',
  reading_ready: 'pipeline',
  compat_complete: 'social',
  invite_accepted: 'social',
  invite_reading_ready: 'social',
  winback: 'social',
  onboarding: 'social',
};
export const pushClass = (type: string): PushClass => CLASS_OF[type] ?? 'social';

/** Does the device's preference allow a push of this type? Pipeline always; fortune/social opt-out. */
export function prefsAllow(type: string, prefs: DeviceRow['notif_prefs']): boolean {
  const c = pushClass(type);
  if (c === 'pipeline') return true;
  if (c === 'fortune') return prefs?.daily_fortune !== false;
  return prefs?.social !== false;
}

/** Quiet hours (device-local hour, default 22:00–08:00). Pipeline pushes ignore quiet hours. */
export function inQuietHours(localHour: number, startHour = 22, endHour = 8): boolean {
  return startHour > endHour ? localHour >= startHour || localHour < endHour : localHour >= startHour && localHour < endHour;
}

/** Should this push actually be sent to this device right now? */
export function shouldSend(job: PushJob, device: DeviceRow, localHour: number): boolean {
  if (!device.expo_push_token) return false;
  if (!prefsAllow(job.type, device.notif_prefs)) return false;
  if (pushClass(job.type) !== 'pipeline' && inQuietHours(localHour)) return false;
  return true;
}

export function buildExpoMessage(token: string, job: PushJob): Record<string, unknown> {
  return { to: token, title: job.title, body: job.body, sound: 'default', data: { ...(job.deep_link ? { deep_link: job.deep_link } : {}), ...(job.data ?? {}) } };
}

const chunk = <T>(xs: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
};

export interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

/** POST messages to Expo in ≤100-message batches; returns tickets in the same order. Injectable
 *  fetch so callers can mock the Expo API. A failed batch yields error tickets (never throws). */
export async function sendExpoPush(messages: Record<string, unknown>[], fetchImpl: typeof fetch = fetch): Promise<ExpoTicket[]> {
  const tickets: ExpoTicket[] = [];
  for (const batch of chunk(messages, EXPO_MAX_BATCH)) {
    try {
      const res = await fetchImpl(EXPO_PUSH_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(batch) });
      if (!res.ok) {
        for (let i = 0; i < batch.length; i++) tickets.push({ status: 'error', message: `expo_http_${res.status}` });
        continue;
      }
      const body = (await res.json()) as { data?: ExpoTicket[] };
      const data = body.data ?? [];
      for (let i = 0; i < batch.length; i++) tickets.push(data[i] ?? { status: 'error', message: 'no_ticket' });
    } catch (e) {
      for (let i = 0; i < batch.length; i++) tickets.push({ status: 'error', message: e instanceof Error ? e.message : 'send_failed' });
    }
  }
  return tickets;
}

/** Tokens whose ticket says DeviceNotRegistered → prune from `devices` (§10). */
export function tokensToPrune(messages: { to?: unknown }[], tickets: ExpoTicket[]): string[] {
  const prune: string[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (tickets[i]?.status === 'error' && tickets[i]?.details?.error === 'DeviceNotRegistered') {
      const to = messages[i]?.to;
      if (typeof to === 'string') prune.push(to);
    }
  }
  return prune;
}
