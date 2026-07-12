// Request context: resolves the auth mode and builds the right Supabase clients (Backend §4).
//   ctx.supabase — RLS-scoped as the calling user (user mode) or admin (secret/none)
//   ctx.admin    — service_role client (BYPASSRLS) for privileged writes
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveAuth, type AuthMode } from './auth-resolve.ts';
import { AppError } from './http.ts';

export interface Ctx {
  mode: AuthMode;
  userId: string | null;
  token: string | null;
  supabase: SupabaseClient;
  admin: SupabaseClient;
}

function env(key: string): string {
  const v = Deno.env.get(key);
  if (!v) throw new AppError('config_error', `missing env ${key}`, 500);
  return v;
}

export function createContext(req: Request): Ctx {
  const url = env('SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');

  const r = resolveAuth(req, { serviceKey, anonKey });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const supabase =
    r.mode === 'user' && r.token
      ? createClient(url, anonKey, {
          global: { headers: { Authorization: `Bearer ${r.token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : admin;

  return { mode: r.mode, userId: r.userId, token: r.token, supabase, admin };
}

/** Guard: throw 403 unless the request is in one of the allowed auth modes. */
export function requireMode(ctx: Ctx, ...modes: AuthMode[]): void {
  if (!modes.includes(ctx.mode)) {
    throw new AppError('forbidden', `this endpoint requires ${modes.join(' | ')} auth`, 403);
  }
}
