import * as Sentry from '@sentry/react-native';
import { PostHog } from 'posthog-react-native';
import { Platform } from 'react-native';

/**
 * Thin, typed analytics + crash facade (mvp_spec §5.8 — required from day one, not bolted on later:
 * the growth hypothesis can't be validated without funnels, K-factor, and retention cohorts).
 *
 * PostHog carries product analytics; Sentry carries crash/error reporting. Both are hidden behind
 * this module so callers depend on a small typed surface, never the vendor SDKs directly.
 *
 * The full event taxonomy (capture funnel, K-factor states, paywall funnel, fortune retention) is
 * implemented at P11.T1 by extending {@link AnalyticsEventMap}. This module establishes the baseline
 * plumbing plus the day-one `app_opened` event.
 *
 * Safe by construction: when the PostHog key / Sentry DSN are absent (web preview, unit tests, CI),
 * nothing is instantiated and every call is a no-op — imports never throw.
 */

// ---- Typed event catalogue (extended in P11.T1) -------------------------------------------------
export type AnalyticsEventMap = {
  /** App brought to the foreground from a cold start. */
  app_opened: { cold_start?: boolean };
};
export type AnalyticsEvent = keyof AnalyticsEventMap;

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

let posthog: PostHog | null = null;
let initialized = false;

/**
 * Initialize crash + analytics. Call once, as early as possible (root layout, before first render).
 * Idempotent. No-ops for whichever of PostHog / Sentry lacks a configured key.
 */
export function initAnalytics(): void {
  if (initialized) return;
  // Skip during the Expo web static export (node SSR) — the vendor SDKs touch window/native at init.
  if (Platform.OS === 'web' && typeof window === 'undefined') return;
  initialized = true;

  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      // No PII by default; we attach the pseudonymous Supabase UUID via identifyUser().
      sendDefaultPii: false,
      tracesSampleRate: 0.2,
    });
  }

  if (POSTHOG_KEY) {
    posthog = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST });
  }
}

/** Capture a typed product event. */
export function track<E extends AnalyticsEvent>(
  event: E,
  properties?: AnalyticsEventMap[E],
): void {
  // Event props are JSON-safe by construction; cast to PostHog's exact param type to stay decoupled.
  posthog?.capture(event, properties as Parameters<PostHog['capture']>[1]);
}

/** Associate subsequent events + crash reports with the (pseudonymous) Supabase UUID. */
export function identifyUser(userId: string): void {
  posthog?.identify(userId);
  Sentry.setUser({ id: userId });
}

/** Clear identity on sign-out / account switch. */
export function resetAnalytics(): void {
  posthog?.reset();
  Sentry.setUser(null);
}

/** Report a handled error to Sentry with optional structured context. */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

/**
 * Wrap the root component with Sentry's error boundary + navigation/touch instrumentation.
 * Safe to use even when Sentry is unconfigured (acts as a pass-through wrapper).
 */
export const withSentry = Sentry.wrap;
