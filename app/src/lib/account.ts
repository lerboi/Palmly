import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

/**
 * Account linking (audit F0.8, UIUX §2.9, Backend §5.1) — converts the anonymous session into a
 * permanent identity WITHOUT ever losing the readings it already owns. Two mechanisms:
 *  - **OAuth** (Apple / Google): `supabase.auth.linkIdentity({ provider })` — attaches the identity
 *    to the current anonymous user.
 *  - **Phone**: `updateUser({ phone })` sends an OTP, then `verifyOtp({ type: 'phone_change' })`
 *    confirms it. (NOT `signInWithOtp` — that would sign INTO a different user and abandon the
 *    anonymous user's readings. AUDIT ERRATA #3.)
 *
 * Every call is total: it returns a typed {@link LinkResult}, never throws, and maps an unconfigured
 * provider (dashboard config is a human task) to a **warm** message instead of a crash.
 */

export type LinkProvider = 'apple' | 'google' | 'phone';

export type LinkResult = { ok: true } | { ok: false; warm: string };

/** Map any Supabase auth error to a warm, human sentence. Unconfigured providers are the common
 *  case pre-launch (Apple/Google/SMS need dashboard setup) and must read as "not yet", not "broken". */
export function warmError(err: { message?: string; code?: string; status?: number } | null | undefined, provider?: LinkProvider): string {
  const msg = (err?.message ?? '').toLowerCase();
  const label = provider === 'apple' ? 'Apple' : provider === 'google' ? 'Google' : provider === 'phone' ? 'Phone' : 'That';
  if (/not enabled|disabled|unsupported provider|provider.*not|is not configured/.test(msg)) {
    return `${label} sign-in isn't available yet — try another way.`;
  }
  if (/sms|phone.*provider|messaging|twilio/.test(msg)) {
    return `Phone sign-in isn't set up yet — try another way.`;
  }
  if (/already|exists|registered|conflict/.test(msg)) {
    return `That account already exists. Sign in on your other device to bring your readings together.`;
  }
  if (/invalid|token|expired|otp|code/.test(msg)) {
    return `That code didn't match. Check it and try again.`;
  }
  if (/rate|too many/.test(msg)) {
    return `Too many tries just now — give it a minute.`;
  }
  return `Couldn't connect right now. Please try again.`;
}

/** Link an OAuth identity to the anonymous user. On native the provider page opens in a secure
 *  web session; on web supabase-js redirects the page on success (an unconfigured provider errors
 *  back before any redirect → the warm path). Live round-trip is device + dashboard-config pending. */
export async function linkOAuth(provider: 'apple' | 'google'): Promise<LinkResult> {
  const redirectTo = Linking.createURL('/settings');
  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
  });
  if (error) return { ok: false, warm: warmError(error, provider) };
  if (Platform.OS !== 'web' && data?.url) {
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type !== 'success') return { ok: false, warm: 'Sign-in was canceled.' };
  }
  return { ok: true };
}

/** Step 1 of phone linking: attach the phone to the anonymous user, sending a 6-digit OTP. */
export async function startPhoneLink(phone: string): Promise<LinkResult> {
  const { error } = await supabase.auth.updateUser({ phone });
  if (error) return { ok: false, warm: warmError(error, 'phone') };
  return { ok: true };
}

/** Step 2 of phone linking: confirm the OTP, which promotes the anonymous user to phone-permanent. */
export async function verifyPhoneLink(phone: string, token: string): Promise<LinkResult> {
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'phone_change' });
  if (error) return { ok: false, warm: warmError(error, 'phone') };
  return { ok: true };
}

/** Sign out of the current session (Settings). The next launch bootstraps a fresh anonymous user. */
export async function signOutAccount(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    /* best-effort */
  }
}

export interface AccountIdentity {
  /** True while still resolving the session (render the neutral state until then). */
  loading: boolean;
  /** The user has not linked a permanent identity yet — the account nudges target this. */
  isAnonymous: boolean;
  /** A human label for the linked identity (email or phone), or null when anonymous/unknown. */
  label: string | null;
}

/**
 * Track whether the current user is still anonymous + a display label for their linked identity.
 * Reads the LOCAL session (no network) and follows auth-state changes, so a successful link flips
 * the nudges off immediately. During the static web export (no window) it stays a neutral
 * non-anonymous default so no account nudge flashes into a screenshot.
 */
export function useAccountIdentity(): AccountIdentity {
  const [state, setState] = useState<AccountIdentity>({ loading: true, isAnonymous: false, label: null });

  useEffect(() => {
    let active = true;
    const apply = (session: { user?: { is_anonymous?: boolean; email?: string | null; phone?: string | null } | null } | null) => {
      if (!active) return;
      const user = session?.user;
      setState({
        loading: false,
        isAnonymous: user?.is_anonymous === true,
        label: user?.email || user?.phone || null,
      });
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
