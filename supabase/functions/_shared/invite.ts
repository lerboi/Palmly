// Invite token generation + hashing (Backend §8, §13). A 32-byte cryptographically-random token is
// the secret that travels in the link (`palmly.app/i/{token}`); only its SHA-256 hash is stored
// (`invites.token_hash`), so a DB leak never yields usable invite links. `invite-claim` verifies a
// presented token by hashing it and matching the stored hash (single-use state machine, 30-day
// expiry — both enforced by the schema/claim). Pure/injectable → unit-testable.

/** URL-safe base64 (RFC 4648 §5), unpadded. */
function base64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** SHA-256 hex of a token — what is stored at rest, and what claim recomputes to verify. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** A fresh 32-byte random token + its hash. The raw token is returned to the caller exactly once. */
export async function generateInviteToken(): Promise<{ token: string; tokenHash: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = base64url(bytes); // 43 url-safe chars
  return { token, tokenHash: await hashToken(token) };
}

/**
 * The base an invite link is built on (audit F0.4) — env-driven so minted links resolve TODAY:
 *  - `INVITE_BASE_URL` override → use it (palmly.app/i once the domain verifies, D1),
 *  - else the deployed functions origin's `invite-page` (staging works before palmly.app exists),
 *  - else `palmly.app/i` (pure unit tests with no env).
 * `invite-page` reads the token from either `/…/{token}` (last path segment) or `?token=`, so the
 * `${base}/${token}` form works for both the domain and the functions origin.
 */
export function inviteBaseUrl(): string {
  const override = Deno.env.get('INVITE_BASE_URL');
  if (override) return override.replace(/\/+$/, '');
  const supa = Deno.env.get('SUPABASE_URL');
  if (supa) return `${supa.replace(/\/+$/, '')}/functions/v1/invite-page`;
  return 'https://palmly.app/i';
}
export const inviteUrl = (token: string): string => `${inviteBaseUrl()}/${token}`;

/**
 * The Android Play-Store install-referrer value carrying the invite token (audit F0.4). A query-
 * string (`token=<token>`) so the recipient client parses it uniformly with the scheme deep link's
 * `?token=` (F0.8) and passes the raw token to `invite-claim`. The token is base64url (no `=`), so a
 * single `URLSearchParams` parse round-trips it. The CALLER url-encodes this whole value for the
 * `&referrer=` param; Play delivers it decoded.
 */
export const inviteReferrer = (token: string): string => `token=${token}`;

/**
 * Short, human-typable fallback code shown on the teaser (§8.2). Derived from the token_hash
 * (hex → no ambiguous letters like O/0 or I/1); `resolve_invite_code` matches invites whose
 * token_hash starts with it.
 *
 * TEN hex chars = 40 bits, widened from six (audit H9, Decision Log D-20). Six is 24 bits = 16.7M
 * codes, and because a prefix match hits ANY live invite the attacker's odds are N/16.7M — at 100k
 * live invites that is ~1 in 167 guesses to hijack a stranger's invite, which also BURNS it (claims
 * are single-use, so the real recipient is locked out). No rate limit rescues that. At 40 bits it is
 * ~1 in 1.1M with a million live invites. The code is derived, never stored, so this cost nothing.
 */
export const SHORT_CODE_HEX = 10;
export const deriveShortCode = (tokenHash: string): string => {
  const s = tokenHash.slice(0, SHORT_CODE_HEX).toUpperCase();
  return `${s.slice(0, 5)}-${s.slice(5, 10)}`;
};


// ── Invite context validation (M6) ───────────────────────────────────────────────────────────────
// `invite-create` used to persist `body.context` verbatim, and `invite-page` renders it on the
// TRUSTED domain (palmly.app/i/{token}) as the headline name and the OG preview image. It is HTML-
// escaped there, so this is not an XSS hole — the exposure is phishing framing and an unbounded
// OG image: an attacker who can mint an invite controls what a recipient sees under our brand, in
// the link preview their messenger renders, before they ever reach the app.
//
// Nothing else constrains it: schema.sql:120 is `context jsonb not null default '{}'` with the
// intended shape only in a comment ({reading_id, card_variant, inviter_name}).

export const INVITE_NAME_MAX = 40;
const CARD_VARIANTS = new Set(['feed_4x5', 'story_9x16']);
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Cap + strip control characters. Unicode-aware: this product's users are largely CJK-named, so an
 *  ASCII allowlist would mangle legitimate names. (Distinct from compat-narrative's sanitizeName,
 *  which additionally strips prompt-framing because its output reaches a MODEL; this one reaches
 *  HTML that is already escaped, so length + control chars are the whole risk.) */
const cleanName = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string') return undefined;
  const s = raw.replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, INVITE_NAME_MAX);
  return s.length ? s : undefined;
};

/** An OG image may only come from somewhere we serve: our own site or our own storage origin.
 *  Otherwise the preview a recipient sees under our brand is attacker-hosted. */
export function isAllowedCardUrl(raw: unknown, allowedHosts: string[]): boolean {
  if (typeof raw !== 'string' || raw.length > 500) return false;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false; // never let a mixed-content/plaintext image through
  return allowedHosts.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
}

/**
 * Keep only the allowlisted, validated keys of an invite's context; drop the rest.
 *
 * Drops rather than throws on purpose: this payload is cosmetic, and failing an invite-create over
 * a bad `card_image_url` would break the growth loop for a legitimate client bug. An attacker's
 * crafted value simply never reaches the page.
 */
export function sanitizeInviteContext(raw: unknown, allowedHosts: string[]): Record<string, unknown> {
  const src = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  const name = cleanName(src.inviter_name);
  if (name) out.inviter_name = name;
  if (typeof src.reading_id === 'string' && UUID_RE.test(src.reading_id)) out.reading_id = src.reading_id;
  if (typeof src.card_variant === 'string' && CARD_VARIANTS.has(src.card_variant)) out.card_variant = src.card_variant;
  if (isAllowedCardUrl(src.card_image_url, allowedHosts)) out.card_image_url = src.card_image_url;

  return out;
}
