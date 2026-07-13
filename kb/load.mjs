/**
 * KB v1 → kb_chunks rows (pure; no DB, no deps). The single source of insert order.
 *
 * Rows are sorted by (tradition, feature_key) so a load is byte-stable and re-runnable —
 * the KB is a versioned artifact (Backend §6.6.7); the same v1 files always produce the same
 * rows in the same order. `embedding` is left null: pass 1/2 use deterministic KEYED lookup
 * (§6.5), not similarity search; embeddings are populated later for chat retrieval (P9).
 *
 * Consumers: `supabase/tests/kb.test.mjs` (transactional proof) and
 * `supabase/tests/scripts/load-kb.mjs` (guarded persistent load into staging).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const KB_VERSION = 'v1';
const FILES = ['palmistry.json', 'physiognomy.json'];

/** @returns {{kb_version:string, tradition:string, feature_key:string, content:string}[]} */
export function kbRows() {
  const rows = [];
  for (const f of FILES) {
    const doc = JSON.parse(fs.readFileSync(path.join(__dirname, KB_VERSION, f), 'utf8'));
    for (const chunk of doc.chunks) {
      rows.push({
        kb_version: doc.kb_version,
        tradition: doc.tradition,
        feature_key: chunk.feature_key,
        content: chunk.content,
      });
    }
  }
  rows.sort((a, b) =>
    a.tradition < b.tradition ? -1 : a.tradition > b.tradition ? 1 : a.feature_key < b.feature_key ? -1 : a.feature_key > b.feature_key ? 1 : 0,
  );
  return rows;
}

/**
 * Insert the v1 rows into kb_chunks on an already-open pg client. Idempotent for a given
 * kb_version: deletes that version's rows first, then inserts. Caller controls the
 * transaction (test rolls back; the persistent loader commits).
 */
export async function loadKbInto(client, { kbVersion = KB_VERSION } = {}) {
  const rows = kbRows().filter((r) => r.kb_version === kbVersion);
  await client.query(`delete from public.kb_chunks where kb_version = $1`, [kbVersion]);
  for (const r of rows) {
    await client.query(
      `insert into public.kb_chunks (kb_version, tradition, feature_key, content) values ($1,$2,$3,$4)`,
      [r.kb_version, r.tradition, r.feature_key, r.content],
    );
  }
  return rows.length;
}
