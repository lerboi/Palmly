// P1.T6 analytics ingestion smoke — device-free proof that the configured PostHog key + Sentry DSN
// accept the app's real payloads end-to-end. Confirms INGESTION (HTTP 200); dashboard-visibility +
// the on-device RN-SDK path remain device-gated (H1). Run: `node scripts/analytics-smoke.mjs`
// (reads EXPO_PUBLIC_* from app/.env). Exit 0 = both services accepted; non-zero = a leg failed.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));

function loadEnv(path) {
  const env = {};
  try {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* file optional */
  }
  return env;
}

const env = { ...loadEnv(join(here, '..', '.env')), ...process.env };
const POSTHOG_KEY = env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const SENTRY_DSN = env.EXPO_PUBLIC_SENTRY_DSN;

const distinctId = `smoke-${randomUUID()}`;
let failures = 0;

async function checkPostHog() {
  if (!POSTHOG_KEY) return console.error('✗ PostHog: EXPO_PUBLIC_POSTHOG_KEY missing'), failures++;
  const res = await fetch(`${POSTHOG_HOST.replace(/\/$/, '')}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: POSTHOG_KEY,
      event: 'app_opened', // exactly the event name analytics.ts emits
      distinct_id: distinctId,
      properties: { cold_start: true, $lib: 'analytics-smoke' },
    }),
  });
  if (res.ok) console.log(`✓ PostHog capture app_opened → HTTP ${res.status} (${await res.text()})`);
  else console.error(`✗ PostHog → HTTP ${res.status}: ${await res.text()}`), failures++;
}

async function checkSentry() {
  if (!SENTRY_DSN) return console.error('✗ Sentry: EXPO_PUBLIC_SENTRY_DSN missing'), failures++;
  // DSN: https://<publicKey>@<host>/<projectId>
  const m = SENTRY_DSN.match(/^https:\/\/([^@]+)@([^/]+)\/(.+)$/);
  if (!m) return console.error(`✗ Sentry: unparseable DSN`), failures++;
  const [, publicKey, host, projectId] = m;
  const eventId = randomUUID().replace(/-/g, '');
  const res = await fetch(`https://${host}/api/${projectId}/store/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=analytics-smoke/1.0`,
    },
    body: JSON.stringify({
      event_id: eventId,
      timestamp: new Date().toISOString(),
      platform: 'node',
      level: 'error',
      message: 'P1.T6 analytics smoke — forced test error',
      tags: { smoke: 'p1t6' },
    }),
  });
  if (res.ok) console.log(`✓ Sentry store event → HTTP ${res.status} (${await res.text()})`);
  else console.error(`✗ Sentry → HTTP ${res.status}: ${await res.text()}`), failures++;
}

await checkPostHog();
await checkSentry();
console.log(failures === 0 ? '\nP1T6_SMOKE_OK' : `\nP1T6_SMOKE_FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
