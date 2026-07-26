/**
 * `push_opened` — the one `expo-notifications` client gap worth closing here (Audit-5 RF0.T4,
 * 03 §9).
 *
 * The event has been in `AnalyticsEventMap` since P11 with **no emitter**: notifications were sent,
 * tapped, and deep-linked, and the funnel never saw a single open. Push→open rate is the morning
 * loop's primary diagnostic (01 §8) — it has to exist before the fan-out ships (RF4), or the first
 * week of the loop is unmeasurable.
 *
 * This module is the PURE half, dependency-free on purpose (the `capabilities.ts` rule): a unit test
 * of the mapper must not drag the notifications SDK into the harness. The subscription that feeds it
 * lives in `notifications.ts`, which already owns the expo-notifications surface.
 */

/** The `type` a tapped notification carries in its data payload, or null when it isn't one of ours. */
export function pushOpenType(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const t = (data as Record<string, unknown>).type;
  if (typeof t !== 'string') return null;
  const trimmed = t.trim();
  // Bound it: `type` arrives from the payload, and an unbounded string would become an unbounded
  // set of analytics property values.
  return trimmed && trimmed.length <= 64 ? trimmed : null;
}
