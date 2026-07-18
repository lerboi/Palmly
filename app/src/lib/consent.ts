import { supabase } from './supabase';

/**
 * Biometric-consent logging (audit F1.3, Backend §9). The camera primer's three reassurance rows
 * (analyzed on the spot · the photo deleted right after the reading, within 24 hours · never shared
 * or used to identify you) ARE the versioned consent text; when the user taps "Allow camera" we
 * record WHICH version they accepted and WHEN, onto their `profiles` row (columns added in migration
 * 0031). Bump this string whenever that primer copy materially changes — v2 folded the canonical
 * deletion promise (the concrete 24-hour bound) into the retention row (audit F1.5).
 */
export const CAMERA_CONSENT_VERSION = 'camera_biometric.v2';

/** Record the camera biometric-consent acceptance. Best-effort — never blocks the capture flow. */
export async function recordCameraConsent(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;
    await supabase
      .from('profiles')
      .update({ consent_version: CAMERA_CONSENT_VERSION, consented_at: new Date().toISOString() })
      .eq('id', uid);
  } catch {
    /* best-effort — a consent-write failure must never strand the user at the primer */
  }
}
