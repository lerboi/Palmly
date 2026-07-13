// Text embeddings for pgvector KB retrieval (Backend §6.5). Gemini `gemini-embedding-001` at 1024
// output dims (matches kb_chunks.embedding vector(1024)). Verified to work on the current free-tier
// key (P9.T6 live probe: HTTP 200, 1024 dims). Injectable fetch so it's unit-testable without
// network. Same retry/backoff policy as the text client.
import { withRetry, type RetryOpts } from './gemini.ts';
import { AppError } from './http.ts';

export const EMBED_MODEL = 'gemini-embedding-001';
export const EMBED_DIMS = 1024;
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface EmbedOpts {
  apiKey?: string;
  dims?: number;
  fetchImpl?: typeof fetch;
  retry?: RetryOpts;
}

interface EmbedResponse {
  embedding?: { values?: number[] };
}

/** Embed one piece of text → a fixed-length numeric vector. Throws AppError on config/API failure
 *  or a dimension mismatch (a wrong-width vector must never be stored against a vector(1024) column). */
export async function embedText(text: string, opts: EmbedOpts = {}): Promise<number[]> {
  const key = opts.apiKey ?? Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new AppError('config_error', 'missing GEMINI_API_KEY', 500);
  const dims = opts.dims ?? EMBED_DIMS;
  const doFetch = opts.fetchImpl ?? fetch;
  const body = { content: { parts: [{ text }] }, outputDimensionality: dims };
  const res = await withRetry(
    () => doFetch(`${ENDPOINT}/${EMBED_MODEL}:embedContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    opts.retry,
  );
  if (!res.ok) throw new AppError('gemini_error', `embedContent responded ${res.status}`, 502, await res.text());
  const json = (await res.json()) as EmbedResponse;
  const vec = json.embedding?.values;
  if (!Array.isArray(vec) || vec.length !== dims) throw new AppError('embed_error', `expected ${dims}-dim embedding, got ${vec?.length ?? 'none'}`, 502);
  return vec;
}

/** Format a numeric vector as a pgvector text literal ('[0.1,0.2,...]') for an RPC/param bind. */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.map((x) => (Number.isFinite(x) ? x : 0)).join(',')}]`;
}
