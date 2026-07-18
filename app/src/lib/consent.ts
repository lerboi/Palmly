import { supabase } from './supabase';

/**
 * Biometric-consent logging (audit F1.3, Backend §9). The camera primer's three reassurance rows
 * ("analyzed on the spot · photo deleted after your reading · never used to identify you") ARE the
 * versioned consent text; when the user taps "Allow camera" we record WHICH version they accepted
 * and WHEN, onto their `profiles` row (columns added in migration 0031). Bump this string whenever
 * that primer copy materially changes.
 */
export const CAMERA_CONSENT_VERSION = 'camera_biometric.v1';

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
