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

export const INVITE_BASE_URL = 'https://palmly.app/i';
export const inviteUrl = (token: string): string => `${INVITE_BASE_URL}/${token}`;

/** Short, human-typable fallback code shown on the teaser (§8.2). Derived from the token_hash
 *  (hex → no ambiguous letters); manual claim matches invites where token_hash starts with it. */
export const deriveShortCode = (tokenHash: string): string => {
  const s = tokenHash.slice(0, 6).toUpperCase();
  return `${s.slice(0, 3)}-${s.slice(3, 6)}`;
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
