import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { track } from './analytics';

/**
 * Push permission + device registration (audit F1.9, Backend §10, UIUX §4). The permission ask is
 * only ever fired at one of the three sanctioned moments (analyzing 75s overrun, daily-fortune
 * opt-in, first compatibility send) — NEVER at launch. Expo push is native-only; on web every call is
 * a graceful no-op. The OS prompt, the Expo push token, and the `devices` write are device-only
 * ([~]) — they need a real device + the EAS projectId; simulator/web can't mint a token.
 */
export type PushPermission = 'granted' | 'denied' | 'undetermined';
export type PushMoment = 'analyzing_overrun' | 'fortune_optin' | 'first_compat_send';

const supported = () => Platform.OS !== 'web';

/** Current OS push-permission status (drives the settings row). Web / unsupported → 'undetermined'. */
export async function getPushPermission(): Promise<PushPermission> {
  if (!supported()) return 'undetermined';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'undetermined';
  }
}

/**
 * Ask for push permission at a sanctioned `moment` (never at launch). Registers the device on grant.
 * Emits `permission_result{granted, kind:'push'}`. Returns whether push is now granted. No-op → false
 * on web / when the OS won't re-ask.
 */
export async function requestPushPermission(_moment: PushMoment): Promise<boolean> {
  if (!supported()) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted' && current.canAskAgain !== false) {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    const granted = status === 'granted';
    track('permission_result', { granted, kind: 'push' });
    if (granted) await registerDevice();
    return granted;
  } catch {
    return false;
  }
}

/**
 * Upsert this device into `devices` (owner RLS) keyed on its Expo push token. Manual find-then-write
 * so it needs no assumed unique constraint. Device-only: the token needs a real device + projectId.
 */
export async function registerDevice(): Promise<void> {
  if (!supported()) return;
  try {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (!token) return;
    const opts = Intl.DateTimeFormat().resolvedOptions();
    const patch = { platform: Platform.OS, timezone: opts.timeZone ?? null, locale: opts.locale ?? null, last_seen_at: new Date().toISOString() };
    const { data: existing } = await supabase.from('devices').select('id').eq('user_id', uid).eq('expo_push_token', token).maybeSingle();
    if (existing?.id) {
      await supabase.from('devices').update(patch).eq('id', existing.id);
    } else {
      await supabase.from('devices').insert({ user_id: uid, expo_push_token: token, ...patch });
    }
  } catch {
    /* device-only, best-effort — a registration failure must never block the flow */
  }
}

const FIRST_COMPAT_KEY = 'palmly.first_compat_push_asked.v1';

/** Sanctioned moment #3: the FIRST time the user sends a compatibility invite, ask for push (so they
 *  hear when the match completes). Fires at most once ever (persisted), and never on web. */
export async function maybeAskFirstCompatPush(): Promise<void> {
  if (!supported()) return;
  try {
    if ((await AsyncStorage.getItem(FIRST_COMPAT_KEY)) === '1') return;
    await AsyncStorage.setItem(FIRST_COMPAT_KEY, '1');
    await requestPushPermission('first_compat_send');
  } catch {
    /* best-effort */
  }
}

const FORTUNE_OPTIN_DISMISSED = 'palmly.fortune_push_optin_dismissed.v1';

/** Has the user dismissed the home daily-fortune push opt-in (so it doesn't nag)? */
export async function fortuneOptInDismissed(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(FORTUNE_OPTIN_DISMISSED)) === '1';
  } catch {
    return false;
  }
}

/** Remember that the home fortune push opt-in was dismissed. */
export async function dismissFortuneOptIn(): Promise<void> {
  try {
    await AsyncStorage.setItem(FORTUNE_OPTIN_DISMISSED, '1');
  } catch {
    /* best-effort */
  }
}

/** Open the OS settings so a user who denied push can re-enable it (the settings status row CTA). */
export async function openSystemNotificationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    /* best-effort */
  }
}
