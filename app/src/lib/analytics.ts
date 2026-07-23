import * as Sentry from '@sentry/react-native';
import { PostHog } from 'posthog-react-native';
import { LogBox, Platform } from 'react-native';

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

// ---- Typed event catalogue (UIUX §8, Backend §14; validates the mvp_spec §10 metrics) ------------
// One typed map is the whole emitter surface — `track('<event>', props)` is compile-time-checked, so
// a typo or a wrong prop shape is a build error. docs/ANALYTICS.md maps each §10 validation metric to
// these events (funnels / cohorts). Events with no properties use `Record<string, never>`.
export type AnalyticsEventMap = {
  // ── App lifecycle ──
  app_opened: { cold_start?: boolean };

  // ── Onboarding funnel (F0.T12 — "where do first-openers fall out before capture?") ──
  onboarding_step_viewed: { step: 'welcome' | 'how_it_works' | 'hand_select' };
  onboarding_skipped: { at: 'welcome' | 'how_it_works' };
  hand_selected: { hand: 'left' | 'right' };

  // ── Capture funnel (P1 — "is capture effortless?") ──
  camera_primer_viewed: Record<string, never>;
  permission_result: { granted: boolean; kind?: 'camera' | 'push' };
  capture_started: { kind: 'palm' | 'face'; hand?: 'left' | 'right' };
  capture_state_dwell: { kind: 'palm' | 'face'; state: string; ms: number };
  capture_completed: { kind: 'palm' | 'face'; method: 'auto' | 'manual'; duration_ms: number };
  capture_abandoned: { kind: 'palm' | 'face'; last_state?: string; duration_ms: number };
  upload_ok: { scan_id: string; kind: 'palm' | 'face' };

  // ── Reading + reveal ("is the wow landing?") ──
  reading_ready: { scan_id: string; kind: 'palm' | 'face'; latency_ms?: number };
  // Analyzing loader overran 75s and the user opted to be freed + notified (F1.T10 upgrades this to
  // a real push-permission ask).
  analyzing_notify_me: { scan_id?: string };
  reveal_viewed: { reading_id: string; kind: 'palm' | 'face' };
  reveal_section_viewed: { reading_id: string; section: string; index: number };
  reveal_scroll_depth: { reading_id: string; pct: number };
  reveal_time_spent: { reading_id: string; ms: number };
  consistency_survey: { reading_id: string; response: 'consistent' | 'inconsistent' | 'unsure' };

  // ── Viral loop (P2 — the invite state machine, "is the loop turning?") ──
  share_sheet_opened: { source: 'reveal' | 'home' | 'face' | 'compat'; reading_id?: string };
  share_completed: { channel: string; card_variant: 'feed' | 'story'; with_invite: boolean };
  invite_created: { channel: string; kind: string };
  invite_clicked: { source?: 'clipboard' | 'referrer' | 'appsflyer' | 'manual_code' | 'web' };
  invite_installed: { source: string };
  invite_accepted: { pair_id: string; source: string };
  pair_reveal_viewed: { pair_id: string; role: 'sender' | 'recipient' };

  // ── Paywall funnel ("is the paywall placed right?") ──
  paywall_viewed: { trigger: 'locked_section' | 'fortune_full' | 'compat_second' | 'chat_entry' | 'post_share' | 'settings'; variant?: string };
  paywall_page_viewed: { trigger: string; page: number };
  paywall_dismissed: { trigger: string; page: number };
  purchase_completed: { plan: 'monthly' | 'annual'; trigger: string };
  winback_converted: Record<string, never>;

  // ── Fortune retention ("is fortune retaining?" — D1/D7/D30) ──
  fortune_opened: { date: string; premium: boolean; streak: number };
  push_opened: { type: string };
  notification_pref_changed: { pref: 'daily_fortune' | 'social' | 'offers'; enabled: boolean };

  // ── Account + privacy ──
  account_linked: { provider: 'apple' | 'google' | 'phone' };
  account_deleted: Record<string, never>;
  scans_deleted: Record<string, never>;

  // ── Chat (premium) ──
  chat_message_sent: { thread_id: string };
  chat_deflected: { category: string };
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

  // Offline dev devices: PostHog's periodic flush (every ~30s) and the boot-time Supabase
  // sign-in each console.error on connectivity failure, and every one raises a full-screen dev
  // LogBox over the running app (they swallowed taps during on-device testing). Pure offline
  // noise — silence ONLY these patterns in the dev overlay (LogBox is dev-only; events still
  // queue, callers still surface their own warm error states, Sentry still captures real errors).
  if (__DEV__) {
    LogBox.ignoreLogs([/Error while flushing PostHog/, /Unable to resolve host/]);
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
