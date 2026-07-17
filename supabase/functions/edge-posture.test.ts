// Edge Function auth-posture matrix (audit §3.3 — "no test exercises ANY Edge Function handler").
//
// WHAT THIS CAN AND CANNOT BE, stated up front so nobody mistakes it for more than it is:
// `verify_jwt` is a PLATFORM gate — the Supabase runtime enforces it BEFORE our code runs. So the
// audit's suggested "no-JWT → 403" handler test is not achievable in a unit test at all: there is no
// code of ours to call. What IS checkable, and is the thing that actually bites, is the CONSISTENCY
// of the two halves of each function's posture:
//
//   * `config.toml` declares the platform gate (`verify_jwt`), and
//   * the handler declares its own gate (`requireMode(ctx, …)`).
//
// Those live in different files and are edited by different reflexes, which is exactly how they
// drift apart. The security note in config.toml says it: `auth-resolve.decodeJwtSub` decodes the JWT
// `sub` WITHOUT verifying the signature — it trusts the platform to have verified upstream. So a
// user-mode function with `verify_jwt = false` accepts a FORGED `sub`, i.e. authenticates as anyone.
// That is the single highest-consequence one-word mistake available in this repo, and until now
// nothing failed if you made it.
//
// This test reads source text, which B20 established is normally the wrong instrument (assert on
// behaviour, not on how it is spelled). It is the right one here for a reason worth naming: the
// artifact under test IS the wiring — a declaration in TOML and a call site in TS — and there is no
// behaviour to observe without deploying (D-24: nothing in this ledger is deployed). Known blind
// spot: the scan matches a literal `requireMode(…, 'user'|'secret')`. A handler that passed the mode
// as a variable would read as ungated and FAIL this test — fail-closed, which is the right direction.
import { assert, assertEquals } from '@std/assert';

const FUNCTIONS_DIR = new URL('.', import.meta.url);
const CONFIG = new URL('../config.toml', import.meta.url);

/** Functions that deliberately have NO in-function mode gate. Adding one is a security decision. */
const PUBLIC_BY_DESIGN: Record<string, string> = {
  // The invite landing page IS the public surface — a stranger following a share link has no JWT.
  // It is read-only, renders escaped HTML, and resolves invites by unguessable token (B13/H9).
  'invite-page': 'public landing page: a link recipient has no session by definition',
  // Gated by an HMAC signature over the raw body instead of by auth mode (C3/D-21). A mode gate
  // would be wrong here: RevenueCat holds no Supabase credential and never will.
  'revenuecat-webhook': 'HMAC-signed webhook: verifyWebhookSignature IS the gate',
};

interface Posture {
  fn: string;
  verifyJwt: boolean;
  modes: string[];
  hmac: boolean;
}

async function readPostures(): Promise<Posture[]> {
  const config = await Deno.readTextFile(CONFIG);
  const out: Posture[] = [];
  for await (const entry of Deno.readDir(FUNCTIONS_DIR)) {
    if (!entry.isDirectory || entry.name.startsWith('_')) continue;
    let source: string;
    try {
      source = await Deno.readTextFile(new URL(`${entry.name}/index.ts`, FUNCTIONS_DIR));
    } catch {
      continue; // a directory without an index.ts is not a function
    }
    // `[functions.<name>]` … `verify_jwt = <bool>` — the first assignment after the header.
    const block = config.match(new RegExp(`\\[functions\\.${entry.name}\\]([\\s\\S]*?)(?=\\n\\[|$)`));
    assert(block, `${entry.name}: no [functions.${entry.name}] block in config.toml — every function must declare its posture explicitly`);
    const vj = block[1].match(/verify_jwt\s*=\s*(true|false)/);
    assert(vj, `${entry.name}: [functions.${entry.name}] does not set verify_jwt`);

    const modes = [...source.matchAll(/requireMode\([^;]*?'(user|secret|none)'/g)].map((m) => m[1]);
    out.push({
      fn: entry.name,
      verifyJwt: vj[1] === 'true',
      modes: [...new Set(modes)].sort(),
      hmac: source.includes('verifyWebhookSignature'),
    });
  }
  return out.sort((a, b) => a.fn.localeCompare(b.fn));
}

Deno.test('posture: every function directory declares a verify_jwt in config.toml', async () => {
  const p = await readPostures();
  // A function with no config block silently takes the platform default, which is exactly the kind
  // of "nobody decided this" that the matrix exists to prevent. readPostures() asserts per-function;
  // this pins the count so a whole function cannot vanish from the matrix unnoticed.
  assertEquals(p.length, 17, `expected 17 functions, found ${p.length}: ${p.map((x) => x.fn).join(', ')}`);
  assert(!p.some((x) => x.fn === 'hello'), 'the hello skeleton is gone (B20) and must not come back');
});

Deno.test('posture: a user-mode handler MUST have verify_jwt=true — else a forged sub authenticates', async () => {
  const userFns = (await readPostures()).filter((x) => x.modes.includes('user'));
  assertEquals(
    userFns.map((x) => x.fn),
    ['account-delete', 'account-merge', 'chat-send', 'compat-request', 'image-delete', 'invite-claim', 'invite-create'],
    'the user-mode set changed — if that is intentional, this list is the place to say so',
  );
  for (const f of userFns) {
    assertEquals(f.verifyJwt, true, `${f.fn} calls requireMode(…,'user') but verify_jwt=false → decodeJwtSub would trust an unverified sub`);
  }
});

Deno.test('posture: a secret-mode worker MUST have verify_jwt=false — else the platform rejects its own cron', async () => {
  const workers = (await readPostures()).filter((x) => x.modes.includes('secret'));
  assertEquals(
    workers.map((x) => x.fn),
    ['card-render', 'cleanup', 'fortune-generate', 'ops-alerts', 'push-dispatch', 'worker-compat', 'worker-narrative', 'worker-scan'],
  );
  for (const f of workers) {
    // These authenticate in-function on the unforgeable service key. verify_jwt=true would make the
    // platform demand a *user* JWT first and 401 the internal caller before the gate ever ran.
    assertEquals(f.verifyJwt, false, `${f.fn} gates on the service key in-function; verify_jwt=true would lock out its own invoker`);
  }
});

Deno.test('posture: a function with NO in-function gate must be public BY DESIGN, with a reason', async () => {
  for (const f of await readPostures()) {
    if (f.modes.length > 0) continue;
    const why = PUBLIC_BY_DESIGN[f.fn];
    assert(
      why,
      `${f.fn} has no requireMode() and is not on the PUBLIC_BY_DESIGN allowlist. If it is genuinely ` +
        `public, add it there WITH a reason; if not, it is an unauthenticated endpoint.`,
    );
    assertEquals(f.verifyJwt, false, `${f.fn} is public by design (${why}) so verify_jwt must be false`);
  }
  // and the allowlist cannot rot: every entry must still be a real, still-ungated function
  const byName = new Map((await readPostures()).map((x) => [x.fn, x]));
  for (const fn of Object.keys(PUBLIC_BY_DESIGN)) {
    const p = byName.get(fn);
    assert(p, `PUBLIC_BY_DESIGN lists ${fn}, which no longer exists — stale allowlist entries are how a gate goes missing`);
    assertEquals(p.modes.length, 0, `${fn} is on the public allowlist but now HAS a mode gate — remove it from the allowlist`);
  }
  assertEquals(byName.get('revenuecat-webhook')?.hmac, true, 'the webhook is ungated ONLY because the HMAC check is its gate — that check must exist');
});
