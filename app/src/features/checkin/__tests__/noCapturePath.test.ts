
/**
 * RF3.T2 / acceptance 02 §10.4 — **no frame is ever written to disk or sent over the network from
 * the check-in path.**
 *
 * The spec makes this a code-inspection gate. A review note is a fine thing, but it is checked once
 * and then trusted forever, and the failure mode here is silent: someone adds a photo output to get
 * a thumbnail, and the promise printed on the ritual's own plate ("No photo is taken, nothing is
 * uploaded") quietly becomes false. So the inspection is automated and runs on every commit.
 *
 * This asserts on source text, which is normally the wrong instrument — but the artifact under test
 * IS the absence of certain calls, and absence has no runtime behaviour to observe. Same reasoning
 * as `edge-posture.test.ts`. It fails closed: a new file in the directory is scanned by default.
 */
export {}; // module scope, so the ambient declarations below stay local to this file

// The app's tsconfig carries no node types (it is a React Native project) and adding them for one
// test would widen the type surface of every source file. So the two node APIs this needs are
// declared here, narrowly, with exactly the shapes used.
declare function require(id: string): unknown;
declare const __dirname: string;

interface DirEnt {
  isFile(): boolean;
  name: string;
}
const { readdirSync, readFileSync } = require('fs') as {
  readdirSync(p: string, o: { withFileTypes: true }): DirEnt[];
  readFileSync(p: string, encoding: 'utf8'): string;
};
const { join } = require('path') as { join(...parts: string[]): string };
const DIR = join(__dirname, '..');

/** Every capture, persistence, or transport call that must not be reachable from this feature. */
const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /capturePhotoToFile|takePhoto|takeSnapshot/, why: 'captures a frame' },
  { pattern: /usePhotoOutput|useVideoOutput/, why: 'attaches an output that can capture' },
  { pattern: /useScanUpload|pickAndUpload|captureAndUpload/, why: 'uploads' },
  { pattern: /expo-image-picker|expo-file-system|FileSystem\./, why: 'touches the filesystem' },
  { pattern: /\bfetch\s*\(|XMLHttpRequest|\.upload\s*\(/, why: 'makes a network request' },
  { pattern: /supabase\.storage|from\('scans'\)/, why: 'writes an image or a scan row' },
];

function sourceFiles(dir: string): { name: string; body: string }[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.(ts|tsx)$/.test(e.name))
    .map((e) => ({ name: e.name, body: readFileSync(join(dir, e.name), 'utf8') }));
}

describe('check-in ritual: no capture, no storage, no upload', () => {
  const files = sourceFiles(DIR);

  it('scans the whole feature directory (a new file cannot opt out by existing)', () => {
    expect(files.length).toBeGreaterThanOrEqual(5);
    expect(files.map((f) => f.name)).toEqual(expect.arrayContaining(['useSealCheckIn.native.tsx', 'SealCheckIn.tsx']));
  });

  it.each(FORBIDDEN)('never $why ($pattern)', ({ pattern }) => {
    const offenders = files
      // Comments legitimately NAME these calls to explain their absence; strip them before scanning
      // so the documentation cannot trip its own gate.
      .map((f) => ({ name: f.name, body: f.body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '') }))
      .filter((f) => pattern.test(f.body))
      .map((f) => f.name);
    expect(offenders).toEqual([]);
  });

  it('the camera output list is landmarks-only', () => {
    const engine = files.find((f) => f.name === 'useSealCheckIn.native.tsx')!.body;
    expect(engine).toMatch(/outputs=\{\[handOutput\]\}/);
    expect(engine).not.toMatch(/outputs=\{\[[^\]]*photo/i);
  });

  it('the privacy line is a shared constant, so no phase can render the ritual without it', () => {
    const checkin = files.find((f) => f.name === 'checkin.ts')!.body;
    expect(checkin).toMatch(/CHECKIN_PRIVACY_LINE/);
    const view = files.find((f) => f.name === 'SealCheckIn.tsx')!.body;
    expect(view).toMatch(/CHECKIN_PRIVACY_LINE/);
  });
});
