/**
 * P5.T4 verify — KB v1 coverage + banned-claims audit (Backend §6.5, §13).
 *
 * Two guarantees, no DB required (deterministic keyed lookup means the KB source files ARE
 * the source of truth; `supabase/tests/kb.test.mjs` additionally proves the same keys resolve
 * once loaded into `kb_chunks`):
 *
 *   1. COVERAGE — every enum value that either feature schema can emit maps to ≥1 KB chunk.
 *      The required key set is DERIVED from the schemas (not hand-listed): a generic walker
 *      collects every enum leaf; KEY_MAP turns each schema path into the canonical feature_key
 *      prefix (or excludes it as meta/quality/pipeline signal). Any enum path the walker finds
 *      that KEY_MAP doesn't cover is a hard FAIL — so adding an enum value or field to a schema
 *      can never silently escape KB coverage.
 *
 *   2. BANNED CLAIMS — no medical/health, lifespan/death, pregnancy, or financial-advice claim
 *      phrasing appears in any chunk (App Store review + spec §9 mitigation). Word-boundary
 *      regexes target claim phrases, NOT palmistry vocabulary (e.g. "life line" is fine;
 *      "lifespan" is banned).
 *
 * Run:  node kb/audit.mjs           (coverage + banned-claims; exit 1 on any failure)
 *       node kb/audit.mjs --list    (print the schema-derived required keys, per tradition)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// ── Schema → enum-leaf walker (resolves #/$defs/* refs) ───────────────────────────────────
function resolveRef(root, ref) {
  const parts = ref.replace(/^#\//, '').split('/');
  return parts.reduce((n, k) => n[k], root);
}

/** Yields { path, values } for every enum leaf. Array items get a `[]` path segment. */
function* enumLeaves(node, root, prefix = '') {
  if (!node || typeof node !== 'object') return;
  if (node.$ref) {
    yield* enumLeaves(resolveRef(root, node.$ref), root, prefix);
    return;
  }
  if (Array.isArray(node.enum)) {
    yield { path: prefix, values: node.enum };
    return;
  }
  if (node.type === 'array' && node.items) {
    yield* enumLeaves(node.items, root, `${prefix}[]`);
    return;
  }
  if (node.properties) {
    for (const [k, v] of Object.entries(node.properties)) {
      yield* enumLeaves(v, root, prefix ? `${prefix}.${k}` : k);
    }
  }
}

const EXCLUDE = Symbol('exclude');

// Schema enum-path → canonical feature_key prefix, or EXCLUDE (meta/quality/pipeline signal).
// Every enum leaf a schema can produce MUST appear here or the audit fails "unmapped path".
const KEY_MAP = {
  palmistry: {
    'hand_shape': 'hand_shape',
    'heart_line.length': 'heart_line.length',
    'heart_line.depth': 'heart_line.depth',
    'heart_line.curvature': 'heart_line.curvature',
    'heart_line.ending': 'heart_line.ending',
    'heart_line.breaks': 'heart_line.breaks',
    'heart_line.islands': 'heart_line.islands',
    'heart_line.chains': 'heart_line.chains',
    'heart_line.confidence': EXCLUDE,
    'head_line.length': 'head_line.length',
    'head_line.depth': 'head_line.depth',
    'head_line.curvature': 'head_line.curvature',
    'head_line.ending': 'head_line.ending',
    'head_line.breaks': 'head_line.breaks',
    'head_line.islands': 'head_line.islands',
    'head_line.chains': 'head_line.chains',
    'head_line.confidence': EXCLUDE,
    'life_line.length': 'life_line.length',
    'life_line.depth': 'life_line.depth',
    'life_line.curvature': 'life_line.curvature',
    'life_line.ending': 'life_line.ending',
    'life_line.breaks': 'life_line.breaks',
    'life_line.islands': 'life_line.islands',
    'life_line.chains': 'life_line.chains',
    'life_line.confidence': EXCLUDE,
    'fate_line.present': 'fate_line.present',
    'fate_line.origin': 'fate_line.origin',
    'fate_line.confidence': EXCLUDE,
    'mounts[].name': 'mount.name',
    'mounts[].prominence': 'mount.prominence',
    'notable_markings[].type': 'marking',
    'exposure_quality': EXCLUDE,
    'overall_confidence': EXCLUDE,
  },
  physiognomy: {
    'face_shape': 'face_shape',
    'three_courts': 'three_courts',
    'five_eyes_spacing': 'five_eyes_spacing',
    'eyebrows.shape': 'eyebrows.shape',
    'eyebrows.confidence': EXCLUDE,
    'eyes.shape': 'eyes.shape',
    'eyes.set': 'eyes.set',
    'eyes.confidence': EXCLUDE,
    'nose.shape': 'nose.shape',
    'nose.bridge': 'nose.bridge',
    'nose.confidence': EXCLUDE,
    'mouth.shape': 'mouth.shape',
    'mouth.confidence': EXCLUDE,
    'ears.set': 'ears.set',
    'ears.size': 'ears.size',
    'ears.confidence': EXCLUDE,
    'canthus_wolong': 'canthus_wolong',
    'overall_confidence': EXCLUDE,
  },
};

const SCHEMA_FILES = {
  palmistry: 'schemas/palm_features.v1.json',
  physiognomy: 'schemas/face_features.v1.json',
};

/** Derive the required feature_key set for a tradition from its schema. Throws on unmapped path. */
export function requiredKeys(tradition) {
  const schema = readJson(path.join(ROOT, SCHEMA_FILES[tradition]));
  const map = KEY_MAP[tradition];
  const keys = new Set();
  const unmapped = [];
  for (const { path: p, values } of enumLeaves(schema, schema)) {
    if (!(p in map)) {
      unmapped.push(p);
      continue;
    }
    const prefix = map[p];
    if (prefix === EXCLUDE) continue;
    for (const v of values) keys.add(`${prefix}.${v}`);
  }
  if (unmapped.length) {
    throw new Error(`unmapped schema enum path(s) in ${tradition} — add to KEY_MAP: ${unmapped.join(', ')}`);
  }
  return keys;
}

// ── KB source loader ──────────────────────────────────────────────────────────────────────
export const KB_VERSION = 'v1';
const KB_FILES = {
  palmistry: `kb/${KB_VERSION}/palmistry.json`,
  physiognomy: `kb/${KB_VERSION}/physiognomy.json`,
};

/** Load a tradition's KB chunks → Map<feature_key, content>. Returns empty map if file absent. */
export function loadKb(tradition) {
  const p = path.join(ROOT, KB_FILES[tradition]);
  const out = new Map();
  if (!fs.existsSync(p)) return out;
  const doc = readJson(p);
  for (const chunk of doc.chunks) {
    if (out.has(chunk.feature_key)) throw new Error(`${tradition}: duplicate feature_key ${chunk.feature_key}`);
    out.set(chunk.feature_key, chunk.content);
  }
  return out;
}

// ── Banned-claims lexicon (Backend §13, spec §9) ────────────────────────────────────────────
// Targets CLAIM phrasing, not palmistry vocabulary. "life line"/"heart line"/"health" of
// spirit are fine; medical diagnosis, lifespan/death prediction, pregnancy, and financial
// advice are not.
const BANNED = [
  // medical / health
  /\bdiseases?\b/i, /\billness(es)?\b/i, /\bdiagnos(e|es|is|ing|tic)\b/i, /\bsymptoms?\b/i,
  /\bcancers?\b/i, /\btumou?rs?\b/i, /\bmedical\b/i, /\bmedicine\b/i, /\bcures?\b/i,
  /\bprescri(be|ption)/i, /\bdiabet(es|ic)\b/i, /\bblood pressure\b/i, /\bimmune\b/i,
  /\bailments?\b/i, /\byour health\b/i, /\bhealth (problem|issue|condition|warning)/i,
  // lifespan / death
  /\blifespan\b/i, /\blife span\b/i, /\blongevity\b/i, /\bhow long you(’|'|)?ll live\b/i,
  /\bwhen you(’|'|)?ll die\b/i, /\byou will die\b/i, /\bmortality\b/i, /\bpredicts? (your )?death\b/i,
  /\byears? (left )?to live\b/i,
  // pregnancy / fertility
  /\bpregnan(t|cy|cies)\b/i, /\bconceive\b/i, /\bmiscarr(y|iage)/i, /\bfertility\b/i,
  /\bnumber of children\b/i,
  // financial advice framing
  /\bfinancial advice\b/i, /\binvest in\b/i, /\bbuy stocks?\b/i, /\bguaranteed (wealth|riches|money|profit|income)\b/i,
];

export function bannedHits(content) {
  return BANNED.filter((re) => re.test(content)).map((re) => re.source);
}

// ── Runner ──────────────────────────────────────────────────────────────────────────────────
function main() {
  const traditions = ['palmistry', 'physiognomy'];

  if (process.argv.includes('--list')) {
    for (const t of traditions) {
      const keys = [...requiredKeys(t)].sort();
      console.log(`\n# ${t} — ${keys.length} required feature_key(s)`);
      for (const k of keys) console.log(k);
    }
    return true;
  }

  let ok = true;
  const fail = (m) => { console.log('FAIL', m); ok = false; };

  let totalReq = 0;
  let totalChunks = 0;
  for (const t of traditions) {
    const req = requiredKeys(t);
    const kb = loadKb(t);
    totalReq += req.size;
    totalChunks += kb.size;

    // Coverage: every required key present.
    const missing = [...req].filter((k) => !kb.has(k)).sort();
    if (missing.length) fail(`${t}: ${missing.length} enum value(s) with no KB chunk:\n     ${missing.join('\n     ')}`);
    else console.log(`OK   ${t}: coverage ${req.size}/${req.size} enum values → a KB chunk`);

    // Orphans: chunks whose key isn't a required key (typo / stale). Not fatal, but reported.
    const orphans = [...kb.keys()].filter((k) => !req.has(k)).sort();
    if (orphans.length) fail(`${t}: ${orphans.length} KB chunk(s) key nothing the schema can emit:\n     ${orphans.join('\n     ')}`);

    // Non-empty content.
    for (const [k, c] of kb) {
      if (!c || c.trim().length < 20) fail(`${t}: chunk ${k} content too short/empty`);
    }

    // Banned claims.
    let banned = 0;
    for (const [k, c] of kb) {
      const hits = bannedHits(c);
      if (hits.length) { banned++; fail(`${t}: chunk ${k} contains banned phrasing [${hits.join(', ')}]: "${c}"`); }
    }
    if (!banned) console.log(`OK   ${t}: banned-claims audit clean over ${kb.size} chunk(s)`);
  }

  console.log(`\nrequired=${totalReq} chunks=${totalChunks}`);
  console.log(ok ? 'P5T4_OK' : 'P5T4_FAIL');
  return ok;
}

// Only run the audit when invoked directly (`node kb/audit.mjs`); stay importable from tests.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ok = main();
  process.exit(ok ? 0 : 1);
}
