// Generates a bundle-able `.ts` sibling for each versioned prompt `.md`, so deployed Edge Functions
// can STATICALLY IMPORT the real versioned prompt. Rationale: the AI functions previously loaded the
// prompt via `Deno.readTextFile('../../../prompts/…')`, a runtime read of a path OUTSIDE
// `supabase/functions/` that the Supabase bundler does NOT include — so deployed functions silently
// fell back to a short inline prompt and mis-stamped `prompt_version` (Decision Log 2026-07-14).
//
// The `.md` stays the human-readable canonical source (also read by the `eval/` scripts); the
// generated `.ts` is imported by the functions so it bundles via the import graph.
//
//   node prompts/build-prompts.mjs           # (re)generate all system_instruction.generated.ts
//   node prompts/build-prompts.mjs --check    # CI: fail if any committed .ts is stale vs its .md
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url)); // prompts/
const check = process.argv.includes('--check');

const render = (md) =>
  `// AUTO-GENERATED from system_instruction.md by prompts/build-prompts.mjs — do not edit by hand.\n` +
  `// Regenerate after editing the .md: \`node prompts/build-prompts.mjs\`.\n` +
  `export const SYSTEM_INSTRUCTION = ${JSON.stringify(md)};\n`;

let stale = 0;
let wrote = 0;
for (const d of readdirSync(ROOT, { withFileTypes: true }).filter((e) => e.isDirectory())) {
  const mdPath = join(ROOT, d.name, 'v1', 'system_instruction.md');
  if (!existsSync(mdPath)) continue;
  const md = readFileSync(mdPath, 'utf8');
  const tsPath = join(ROOT, d.name, 'v1', 'system_instruction.generated.ts');
  const next = render(md);
  const cur = existsSync(tsPath) ? readFileSync(tsPath, 'utf8') : '';
  if (check) {
    if (cur !== next) {
      console.error(`STALE: prompts/${d.name}/v1/system_instruction.generated.ts (run: node prompts/build-prompts.mjs)`);
      stale++;
    }
  } else if (cur !== next) {
    writeFileSync(tsPath, next);
    console.log(`wrote prompts/${d.name}/v1/system_instruction.generated.ts (${md.length} chars)`);
    wrote++;
  }
}
if (check) {
  console.log(stale ? `PROMPTS_STALE (${stale})` : 'PROMPTS_OK');
  process.exit(stale ? 1 : 0);
}
console.log(`done — ${wrote} file(s) written`);
