// Pure auth-mode resolver (Backend §4: `user` | `secret` | `none`). No external deps so it is
// cheaply unit-testable. Client construction lives in context.ts.
import { constantTimeEqual } from './timing.ts';

export type AuthMode = 'user' | 'secret' | 'none';

export interface ResolvedAuth {
  mode: AuthMode;
  token: string | null;
  userId: string | null;
}

/** Bearer token from Authorization, else the `apikey` header. */
export function bearerToken(req: Request): string | null {
  const auth = req.headers.get('Authorization') ?? req.headers.get('authorization');
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return req.headers.get('apikey');
}

/** Decode a JWT payload's `sub` claim without verifying (the platform verifies upstream). */
export function decodeJwtSub(jwt: string): string | null {
  try {
    const payload = jwt.split('.')[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64));
    return typeof json.sub === 'string' ? json.sub : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the auth mode from the request:
 *  - service (`sb_secret_…`) key  → `secret` (internal / worker)
 *  - a user JWT (`eyJ…` access token, incl. anonymous users) → `user`
 *  - the publishable/anon key or nothing → `none` (public)
 */
export function resolveAuth(
  req: Request,
  env: { serviceKey?: string; anonKey?: string },
): ResolvedAuth {
  const token = bearerToken(req);
  if (!token) return { mode: 'none', token: null, userId: null };
  // Constant-time: this compare IS the internal privilege gate (`requireMode 'secret'`) for every
  // worker, so a plain `===` — which returns on the first differing character — makes it a timing
  // oracle. Theoretical (a network hides far more jitter than a string compare reveals, and the
  // secret being compared IS the key, so the gate is exactly key-possession), but the primitive is
  // five lines and this is the wrong place to be interesting.
  if (env.serviceKey && constantTimeEqual(token, env.serviceKey)) return { mode: 'secret', token, userId: null };
  // The anon/publishable key is deliberately a plain compare: it is published in the client bundle,
  // so there is no secret to leak and nothing to protect against timing.
  if (env.anonKey && token === env.anonKey) return { mode: 'none', token, userId: null };
  if (token.startsWith('eyJ')) return { mode: 'user', token, userId: decodeJwtSub(token) };
  return { mode: 'none', token, userId: null };
}
