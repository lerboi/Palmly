import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { track } from './analytics';
import { pushOpenType } from './pushOpen';

/**
 * Emit `push_opened` for the notification tap that brought the user here (Audit-5 RF0.T4, 03 §9).
 *
 * The event has been in `AnalyticsEventMap` since P11 with no emitter: notifications were sent,
 * tapped and deep-linked, and the funnel never saw a single open. Push→open rate is the morning
 * loop's primary diagnostic (01 §8), so it has to exist before the fan-out ships.
 *
 * `useLastNotificationResponse` covers BOTH cases with one subscription — a cold start where the tap
 * launched the app, and a warm tap while it was already running — and de-duplicates internally, so
 * one tap can never be double-counted.
 *
 * Native-only by FILE, not by a runtime check: the web build resolves the `.ts` sibling and never
 * loads this module. See that file for what happens if you try it the other way.
 *
 * Deliberately narrow: read the tap, emit one typed event. Navigation stays with expo-router's deep
 * linking — routing here too would give a tapped push two competing destinations.
 */
export function usePushOpenTracking(): void {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!response) return;
    const type = pushOpenType(response.notification?.request?.content?.data);
    if (type) track('push_opened', { type });
  }, [response]);
}
