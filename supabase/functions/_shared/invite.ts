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

