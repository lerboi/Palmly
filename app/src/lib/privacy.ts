import { supabase } from './supabase';
import { resetAnalytics } from './analytics';

/**
 * Privacy/trust ACTIONS (audit F1.5, Backend §9) — the live delete/keep/notify writes behind the
 * privacy & notification surfaces. The canonical deletion *copy* lives in dependency-free
 * `./trustCopy` (so pure copy modules can render it without the supabase graph); import the string
 * from there, the actions from here.
 */
export type ActionResult = { ok: boolean; message: string };

/** "Delete my scan photos now" (PrivacyCenter) → the deployed `image-delete` fn. Keeps the readings. */
export async function deleteScanPhotos(): Promise<ActionResult> {
  const { data, error } = await supabase.functions.invoke('image-delete', { body: {} });
  if (error) return { ok: false, message: 'Couldn’t delete just now — please try again.' };
  // image-delete responds `{ deleted, storage_objects_removed, storage_objects_total }`.
  const removed = (data as { storage_objects_removed?: number } | null)?.storage_objects_removed ?? 0;
  return { ok: true, message: removed > 0 ? 'Photos deleted ✓' : 'No photos to delete — you’re clear ✓' };
}

/** "Delete everything" (PrivacyCenter) → the deployed `account-delete` fn, then sign out locally. */
export async function deleteEverything(): Promise<ActionResult> {
  const { error } = await supabase.functions.invoke('account-delete', { body: {} });
  if (error) return { ok: false, message: 'Couldn’t delete your account — please try again.' };
  try {
    resetAnalytics();
    await supabase.auth.signOut();
  } catch {
    /* the account is gone server-side; a local sign-out failure is non-fatal */
  }
  return { ok: true, message: 'Your account and data are deleted.' };
}

/**
 * Persist the keep-my-scan-photos consent (§9 D2) onto `scans.keep_image`. `scans` is
 * service-role-write-only (only a SELECT policy exists), so a direct client `update` silently writes
 * 0 rows — this goes through the `set_keep_image` SECURITY DEFINER RPC (migration 0032), which flips
 * keep_image on the caller's OWN scans (auth.uid()) and nothing else. keep_image=true opts the crop
 * out of the 24h cleanup sweep.
 */
export async function setKeepPhoto(keep: boolean): Promise<void> {
  try {
    await supabase.rpc('set_keep_image', { p_keep: keep });
  } catch {
    /* best-effort */
  }
}

/** Read the current keep-photo consent from the caller's scans (true only if all are kept). */
export async function loadKeepPhoto(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return false;
    const { data: rows } = await supabase.from('scans').select('keep_image').eq('user_id', uid).limit(50);
    const list = (rows as { keep_image: boolean }[] | null) ?? [];
    return list.length > 0 && list.every((r) => r.keep_image);
  } catch {
    return false;
  }
}

export type NotifPref = 'daily_fortune' | 'social' | 'offers';
export type NotifPrefs = Record<NotifPref, boolean>;
const DEFAULT_PREFS: NotifPrefs = { daily_fortune: true, social: true, offers: false };

/**
 * Notification prefs live on `devices.notif_prefs` — created at push registration, tied to a device's
 * Expo push token (Backend §10). On a device the toggles read/write the caller's device row(s); on
 * the web export there is no device row (no push token), so persistence is a device leg ([~]).
 */
export async function loadNotifPrefs(): Promise<NotifPrefs> {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return DEFAULT_PREFS;
    const { data: row } = await supabase.from('devices').select('notif_prefs').eq('user_id', uid).order('last_seen_at', { ascending: false }).limit(1).maybeSingle();
    const p = (row as { notif_prefs?: Partial<NotifPrefs> } | null)?.notif_prefs ?? {};
    return { ...DEFAULT_PREFS, ...p };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Persist one notification toggle onto the caller's device row(s) `notif_prefs` jsonb. */
export async function saveNotifPref(pref: NotifPref, enabled: boolean): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;
    const current = await loadNotifPrefs();
    const next = { ...current, [pref]: enabled };
    await supabase.from('devices').update({ notif_prefs: next }).eq('user_id', uid);
  } catch {
    /* best-effort */
  }
}
