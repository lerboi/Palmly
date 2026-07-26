// Generates a bundle-able `.ts` copy of the Line Cycles catalog for the APP, from the canonical
// `kb/cycles/v1/chapters.json` that the Edge Functions import directly.
//
// Rationale, and it is the mirror image of `prompts/build-prompts.mjs`: Metro only resolves modules
// under the app's project root, so `app/` cannot import `kb/…` at runtime — the bundle would build
// on a dev machine and fail (or silently shrink) elsewhere. The Deno side has the opposite
// constraint and imports the JSON directly, so the JSON stays canonical and the app gets a
// generated sibling committed next to the code that uses it.
//
//   node kb/build-cycles.mjs            # (re)generate app/src/features/pulse/chapters.generated.ts
//   node kb/build-cycles.mjs --check    # CI: fail if the committed copy is stale
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'kb', 'cycles', 'v1', 'chapters.json');
const OUT = join(ROOT, 'app', 'src', 'features', 'pulse', 'chapters.generated.ts');
const check = process.argv.includes('--check');

const catalog = JSON.parse(readFileSync(SRC, 'utf8'));

// Only what the client renders. The `note` is documentation for humans reading the JSON and would
// be dead weight in every user's bundle.
const slim = { cycles_version: catalog.cycles_version, archetypes: catalog.archetypes };

const next =
  `// AUTO-GENERATED from kb/cycles/v1/chapters.json by kb/build-cycles.mjs — do not edit by hand.\n` +
  `// Regenerate after editing the catalog: \`node kb/build-cycles.mjs\`.\n` +
  `//\n` +
  `// Why a generated copy: Metro cannot resolve modules outside app/, and the Edge Functions cannot\n` +
  `// import from app/. The JSON stays canonical; this is its bundle-able shadow.\n` +
  `export interface ChapterArchetypeEntry {\n` +
  `  name: string;\n` +
  `  tease: string;\n` +
  `  body: string;\n` +
  `  features: Record<string, string>;\n` +
  `}\n\n` +
  `export const CYCLES_VERSION = ${JSON.stringify(slim.cycles_version)};\n\n` +
  `export const CHAPTER_CATALOG: Record<string, ChapterArchetypeEntry> = ${JSON.stringify(slim.archetypes, null, 2)};\n`;

const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';

if (check) {
  if (cur !== next) {
    console.error('STALE: app/src/features/pulse/chapters.generated.ts (run: node kb/build-cycles.mjs)');
    console.log('CYCLES_STALE');
    process.exit(1);
  }
  console.log('CYCLES_OK');
  process.exit(0);
}

if (cur !== next) {
  writeFileSync(OUT, next);
  console.log(`wrote app/src/features/pulse/chapters.generated.ts (${Object.keys(slim.archetypes).length} archetypes)`);
} else {
  console.log('up to date');
}
