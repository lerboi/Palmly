/**
 * `push_opened` tracking — WEB STUB (Audit-5 RF0.T4).
 *
 * Platform-split for a reason found the hard way: `Notifications.useLastNotificationResponse()`
 * calls `getLastNotificationResponse()`, which **throws `UnavailabilityError` on web** — and because
 * the hook lives in the ROOT layout, that throw took down the entire web export, blanking every
 * screen in the device-free screenshot harness. A `Platform.OS !== 'web'` check inside the hook
 * cannot save it: the hook has already been called by then.
 *
 * So the web build gets this file and never imports the native module at all. There is nothing to
 * track here anyway: a web page has no notifications to be opened from.
 */
export function usePushOpenTracking(): void {
  /* no notifications on web — nothing to observe */
}
