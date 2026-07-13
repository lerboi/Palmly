import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from './supabase';

// Refresh tokens only while the app is foregrounded (supabase-js RN guidance).
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

/**
 * Anonymous-first auth (Backend §5.1): reuse an existing persisted session, else create one via
 * `signInAnonymously()`. Returns the user id (or null if sign-in is unavailable). The matching
 * `profiles` row is created server-side by the `on_auth_user_created` trigger (migration 0005).
 * TODO(H5): once the Turnstile site key exists, pass `options.captchaToken`.
 */
export async function ensureSession(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) return session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('[auth] anonymous sign-in failed:', error.message);
    return null;
  }
  return data.user?.id ?? null;
}

export type AuthState = { userId: string | null; loading: boolean };

/** Bootstrap a session on launch and track the current user id. */
export function useAuthBootstrap(): AuthState {
  const [state, setState] = useState<AuthState>({ userId: null, loading: true });

  useEffect(() => {
    let active = true;
    ensureSession().then((userId) => {
      if (active) setState({ userId, loading: false });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ userId: session?.user?.id ?? null, loading: false });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
