/**
 * Persistently apply all migrations to STAGING (not rolled back). Use only when staging
 * genuinely needs the real schema (e.g. before P5 workers run against it, or as a manual
 * stand-in for the P3.T5 CI deploy). Guarded — pass CONFIRM=1.
 *
 *   CONFIRM=1 node supabase/tests/scripts/apply.mjs
 *
 * Day-to-day development does NOT use this — tests run transactionally (see lib/db.mjs).
 */
import { connect, loadMigrations } from '../lib/db.mjs';

const migs = loadMigrations();
if (migs.length === 0) {
  console.log('no migrations to apply');
  process.exit(0);
}
if (process.env.CONFIRM !== '1') {
  console.log(`Refusing to mutate staging without CONFIRM=1. Would apply ${migs.length} migration(s):`);
  for (const m of migs) console.log('  -', m.name);
  process.exit(1);
}

const c = await connect();
try {
  for (const m of migs) {
    process.stdout.write(`applying ${m.name} ... `);
    await c.query('begin');
    try {
      await c.query(m.sql);
      await c.query('commit');
      console.log('ok');
    } catch (e) {
      await c.query('rollback');
      console.log('FAILED');
      throw new Error(`${m.name}: ${e.message}`);
    }
  }
  console.log('all migrations applied to staging');
} finally {
  await c.end();
}
