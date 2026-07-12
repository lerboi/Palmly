/**
 * Docker-free Postgres test harness for Palmly's backend.
 *
 * Rationale (Decision Log 2026-07-12): the user opted out of Docker, so instead of the
 * local `supabase start` stack we exercise migrations + RLS against the real **staging**
 * Postgres inside a transaction that is ALWAYS rolled back — real Supabase platform
 * (auth schema, `auth.uid()`, roles) with zero persistent mutation of staging.
 *
 * Secrets: the DB password is read from the git-ignored `.env.staging`; never logged,
 * never committed. `connString()` builds the direct connection to `db.<ref>.supabase.co`.
 */
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
export const MIGRATIONS_DIR = path.join(REPO_ROOT, 'supabase', 'migrations');

function loadEnvStaging() {
  const p = path.join(REPO_ROOT, '.env.staging');
  const out = {};
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    }
  }
  return out;
}

export function connString() {
  const env = { ...loadEnvStaging(), ...process.env };
  if (env.SUPABASE_DB_URL) return env.SUPABASE_DB_URL;
  const ref = env.SUPABASE_STAGING_PROJECT_REF;
  const pw = env.SUPABASE_STAGING_DB_PASSWORD;
  if (!ref || !pw) throw new Error('db.mjs: missing SUPABASE_STAGING_PROJECT_REF / SUPABASE_STAGING_DB_PASSWORD (.env.staging)');
  return `postgresql://postgres:${encodeURIComponent(pw)}@db.${ref}.supabase.co:5432/postgres`;
}

export async function connect() {
  const c = new pg.Client({ connectionString: connString(), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
  await c.connect();
  return c;
}

export function loadMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({ name: f, sql: fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8') }));
}

/** Apply every migration file in order against the given (already-open) client. */
export async function applyMigrations(client) {
  for (const m of loadMigrations()) {
    try {
      await client.query(m.sql);
    } catch (e) {
      throw new Error(`migration ${m.name} failed: ${e.message}`);
    }
  }
}

/**
 * Run fn inside a transaction that is ALWAYS rolled back — the isolation primitive for
 * every backend test. Nothing fn does persists to staging.
 */
export async function withRollback(fn) {
  const c = await connect();
  try {
    await c.query('begin');
    return await fn(c);
  } finally {
    try {
      await c.query('rollback');
    } catch {
      /* ignore */
    }
    await c.end();
  }
}

const ROLES = new Set(['authenticated', 'anon', 'service_role', 'postgres']);

/**
 * Impersonate a Supabase auth context within the current transaction so RLS applies and
 * `auth.uid()` / `auth.jwt()` resolve. Superuser (postgres) bypasses RLS — always switch
 * to `authenticated`/`anon` before asserting a policy.
 */
export async function asRole(client, { uid = null, role = 'authenticated', isAnonymous = false } = {}) {
  if (!ROLES.has(role)) throw new Error(`asRole: unknown role ${role}`);
  await client.query(`set local role ${role}`);
  const claims = { role, is_anonymous: isAnonymous };
  if (uid) claims.sub = uid;
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
}

/** Drop back to the connection's own (superuser) role and clear JWT claims. */
export async function resetRole(client) {
  await client.query('reset role');
  await client.query(`select set_config('request.jwt.claims', NULL, true)`);
}

/** Insert a minimal valid auth.users row (for FK refs); returns the uuid. */
export async function seedUser(client, uid, { email = null, isAnonymous = false } = {}) {
  await client.query(
    `insert into auth.users (id, instance_id, aud, role, email, is_anonymous)
     values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, $3)`,
    [uid, email ?? `${uid.slice(0, 8)}@test.local`, isAnonymous],
  );
  return uid;
}
