export {}; // module scope, so the ambient declarations below stay local to this file

/**
 * Every platform-split pair must share ONE file extension.
 *
 * Metro walks `sourceExts` in order and, for each extension, tries `.android.<ext>` →
 * `.native.<ext>` → `.<ext>`. `ts` is tried before `tsx`. So a pair written as
 * `foo.ts` + `foo.native.tsx` resolves the **base** file on device and never reaches the native
 * one — the web stub silently wins, on a real phone, with no error anywhere.
 *
 * That is not hypothetical: it shipped in the Audit-5 check-in ritual and was found on the S20+
 * (2026-07-27) only because the ritual said "the camera isn't available" while the camera
 * permission was granted. Nothing else caught it — tsc and jest both resolve the base file too, so
 * the whole test suite stayed green while the feature was dead.
 *
 * The failure is invisible by construction, so the guard has to be structural.
 */
declare function require(id: string): unknown;
declare const __dirname: string;

interface DirEnt {
  isFile(): boolean;
  isDirectory(): boolean;
  name: string;
}
const { readdirSync } = require('fs') as { readdirSync(p: string, o: { withFileTypes: true }): DirEnt[] };
const { join } = require('path') as { join(...parts: string[]): string };

const SRC = join(__dirname, '..');

/** Every source file under src/, as { dir, name }. */
function walk(dir: string): { dir: string; name: string }[] {
  const out: { dir: string; name: string }[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '__tests__') continue;
      out.push(...walk(join(dir, e.name)));
    } else if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) {
      out.push({ dir, name: e.name });
    }
  }
  return out;
}

const files = walk(SRC);

/** `useFoo.native.tsx` → { stem: 'useFoo', platform: 'native', ext: 'tsx' } */
function parse(name: string): { stem: string; platform: string | null; ext: string } {
  const m = /^(.*?)(?:\.(native|android|ios|web))?\.(ts|tsx)$/.exec(name);
  if (!m) return { stem: name, platform: null, ext: '' };
  return { stem: m[1], platform: m[2] ?? null, ext: m[3] };
}

describe('platform-split modules', () => {
  it('finds the repo’s source files (the walker is not silently empty)', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('every platform variant shares its base file’s extension', () => {
    const offenders: string[] = [];
    // Group by directory + stem, so `useSealCheckIn.tsx` and `useSealCheckIn.native.tsx` pair up.
    const groups = new Map<string, { name: string; platform: string | null; ext: string }[]>();
    for (const f of files) {
      const p = parse(f.name);
      if (!p.ext) continue;
      const key = `${f.dir}::${p.stem}`;
      groups.set(key, [...(groups.get(key) ?? []), { name: f.name, platform: p.platform, ext: p.ext }]);
    }

    for (const [key, members] of groups) {
      const variants = members.filter((m) => m.platform !== null);
      const base = members.find((m) => m.platform === null);
      if (!variants.length || !base) continue; // not a split, or a variant with no base
      for (const v of variants) {
        if (v.ext !== base.ext) {
          offenders.push(`${key.split('::')[1]}: ${v.name} vs base ${base.name} — Metro resolves the base first`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('knows about the real splits it is guarding (not vacuously passing)', () => {
    const names = files.map((f) => f.name);
    expect(names).toEqual(
      expect.arrayContaining(['useSealCheckIn.native.tsx', 'useSealCheckIn.tsx', 'useGuidedCapture.native.tsx', 'useGuidedCapture.tsx']),
    );
  });
});
