import { supabase } from './supabase';

/**
 * Share-invite minting (audit F0.4; Backend §8). Calls the deployed user-mode `invite-create`, which
 * inserts an RLS-scoped `invites` row (inviter = the caller) and returns the one-time shareable URL.
 * The URL base is `palmly.app/i/{token}` until F0.T7 makes `INVITE_BASE_URL` env-driven (staging
 * origin) — the dead base here is expected and does not block minting.
 */
export interface CreatedInvite {
  inviteId: string;
  url: string;
}

export async function createInvite(params: {
  readingId?: string;
  kind?: 'compatibility' | 'generic';
  channel?: string;
}): Promise<CreatedInvite> {
  const { data, error } = await supabase.functions.invoke('invite-create', {
    body: {
      kind: params.kind ?? 'compatibility',
      ...(params.readingId ? { context: { reading_id: params.readingId } } : {}),
      ...(params.channel ? { channel: params.channel } : {}),
    },
  });
  const res = (data ?? {}) as { invite_id?: string; url?: string };
  if (error || !res.invite_id || !res.url) {
    throw new Error('invite-create failed');
  }
  return { inviteId: res.invite_id, url: res.url };
}

/** The pre-composed share message (UIUX §2.6) — the essence + a compare invite when a URL is present. */
export function composeShareText(headline: string, url?: string): string {
  const lead = `Palmly read my palm — ${headline}`;
  return url ? `${lead}\nSee what yours says & compare palms: ${url}` : lead;
}
