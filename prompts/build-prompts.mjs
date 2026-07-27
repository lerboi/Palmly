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

// Every version directory, not just `v1`. This walk was hardcoded to `v1`, which meant a new
// versioned prompt (`prompts/pulse/v2/`) generated NOTHING, `--check` stayed green, and the Edge
// Function kept bundling the old text — a silent no-op with every test passing, which is the exact
// failure mode the versioned-artifact rule exists to avoid (Audit-5 RF6.T1).
const versionDirs = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^v\d+$/.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

let stale = 0;
let wrote = 0;
let seen = 0;
for (const d of readdirSync(ROOT, { withFileTypes: true }).filter((e) => e.isDirectory())) {
  for (const v of versionDirs(join(ROOT, d.name))) {
    const mdPath = join(ROOT, d.name, v, 'system_instruction.md');
    if (!existsSync(mdPath)) continue;
    seen++;
    const md = readFileSync(mdPath, 'utf8');
    const tsPath = join(ROOT, d.name, v, 'system_instruction.generated.ts');
    const next = render(md);
    const cur = existsSync(tsPath) ? readFileSync(tsPath, 'utf8') : '';
    if (check) {
      if (cur !== next) {
        console.error(`STALE: prompts/${d.name}/${v}/system_instruction.generated.ts (run: node prompts/build-prompts.mjs)`);
        stale++;
      }
    } else if (cur !== next) {
      writeFileSync(tsPath, next);
      console.log(`wrote prompts/${d.name}/${v}/system_instruction.generated.ts (${md.length} chars)`);
      wrote++;
    }
  }
}
// A walk that matched nothing used to report PROMPTS_OK. Now it says so and fails: "found no
// prompts" and "every prompt is current" must never print the same line.
if (!seen) {
  console.error('PROMPTS_NONE — the walk matched no system_instruction.md (check prompts/*/v*/)');
  process.exit(1);
}
if (check) {
  console.log(stale ? `PROMPTS_STALE (${stale})` : 'PROMPTS_OK');
  process.exit(stale ? 1 : 0);
}
console.log(`done — ${wrote} file(s) written`);
