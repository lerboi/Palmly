// RevenueCat client wiring (Backend §5.2). The RC `appUserID` MUST equal the Supabase user UUID so
// one identity spans both systems, works for anonymous users, and survives account linking (the
// UUID never changes — no RC alias juggling). The native SDK (react-native-purchases) + the public
// SDK keys arrive with Human-tasks H8 + a device; this is the single wiring point where they plug
// in. Until then `configureRevenueCat` is a safe no-op so sign-in can call it unconditionally.
const RC_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const RC_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

export const revenueCatConfigured = (): boolean => Boolean(RC_IOS_KEY || RC_ANDROID_KEY);

/**
 * Configure RevenueCat with the Supabase UUID as its appUserID. TODO(H8): once
 * `react-native-purchases` is installed and the public keys exist, replace the body with
 * `Purchases.configure({ apiKey: Platform.OS === 'ios' ? RC_IOS_KEY! : RC_ANDROID_KEY!, appUserID: userId })`.
 */
export async function configureRevenueCat(userId: string): Promise<void> {
  if (!revenueCatConfigured()) return; // keys land with H8
  // Purchases.configure({ apiKey: ..., appUserID: userId }) — wired on-device (H1) with the SDK.
  void userId;
}
