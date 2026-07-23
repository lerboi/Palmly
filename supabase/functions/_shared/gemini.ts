// Gemini client with retry/backoff on 429/5xx (Backend §6). `withRetry` is separated out so the
// backoff policy is unit-testable with a mock response producer (no network).

import { AppError } from './http.ts';

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export interface RetryOpts {
  maxRetries?: number;
  baseDelayMs?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Call `produce` up to maxRetries+1 times; retry only on 429/5xx with exponential backoff + jitter. */
export async function withRetry(
  produce: (attempt: number) => Promise<Response>,
  opts: RetryOpts = {},
): Promise<Response> {
  const max = opts.maxRetries ?? 4;
  const base = opts.baseDelayMs ?? 400;
  let last: Response | undefined;
  for (let attempt = 0; attempt <= max; attempt++) {
    const res = await produce(attempt);
    if (res.ok || !RETRYABLE.has(res.status)) return res;
    last = res;
    if (attempt < max) await sleep(base * 2 ** attempt * (0.8 + Math.random() * 0.4));
  }
  return last as Response;
}

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GenerateOpts {
  model: string;
  body: unknown;
  apiKey?: string;
  retry?: RetryOpts;
  fetchImpl?: typeof fetch;
}

/** POST to Gemini generateContent with retry/backoff; throws AppError on config/API failure. */
export async function generateContent(opts: GenerateOpts): Promise<unknown> {
  const key = opts.apiKey ?? Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new AppError('config_error', 'missing GEMINI_API_KEY', 500);
  const doFetch = opts.fetchImpl ?? fetch;
  const res = await withRetry(
    () =>
      doFetch(`${ENDPOINT}/${opts.model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts.body),
      }),
    opts.retry,
  );
  if (!res.ok) {
    // withRetry already absorbed transient 429/5xx; a non-429 4xx surviving to here is a
    // PERMANENT request rejection (e.g. an invalid responseSchema — found live 2026-07-24, when
    // a 400 spent an hour disguised as "gemini_unavailable"). Distinguish the two so workers can
    // fail fast instead of burning visibility-timeout retries on a request that can never work.
    const permanent = res.status >= 400 && res.status < 500 && res.status !== 429;
    throw new AppError(
      permanent ? 'gemini_rejected' : 'gemini_error',
      `Gemini responded ${res.status}`,
      permanent ? 400 : 502,
      await res.text(),
    );
  }
  return await res.json();
}
