/**
 * Persistently load KB v1 into STAGING `kb_chunks` (not rolled back). Idempotent per kb_version.
 * Guarded — pass CONFIRM=1:
 *
 *   CONFIRM=1 node supabase/tests/scripts/load-kb.mjs
 *
 * kb_chunks is content, not user data (readable by `authenticated`), so this is a legitimate
 * seed. Day-to-day verification does NOT use this — `kb.test.mjs` proves load + keyed lookup
 * transactionally. Run this once staging needs the real KB (before worker-narrative, P5.T6).
 */
import { connect } from '../lib/db.mjs';
import { loadKbInto, KB_VERSION } from '../../../kb/load.mjs';

if (process.env.CONFIRM !== '1') {
  console.log(`Refusing to mutate staging without CONFIRM=1. Would (re)load KB ${KB_VERSION} into kb_chunks.`);
  process.exit(1);
}

const c = await connect();
try {
  await c.query('begin');
  const n = await loadKbInto(c);
  await c.query('commit');
  console.log(`loaded ${n} KB ${KB_VERSION} chunks into staging kb_chunks`);
} catch (e) {
  await c.query('rollback');
  throw new Error(`KB load failed: ${e.message}`);
} finally {
  await c.end();
}
