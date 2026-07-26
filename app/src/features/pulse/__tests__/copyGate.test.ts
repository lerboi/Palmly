export {}; // module scope, so the ambient declarations below stay local to this file

/**
 * RF5.T2 — the copy / honesty gate for everything Audit-5 added.
 *
 * The Audit-4 discipline this enforces, applied to the new surfaces:
 *   • the dev codename **`pulse` never appears in UI copy** (02 §9). It is all over the source —
 *     modules, hooks, analytics — and exactly one slip would put it in front of a user;
 *   • typographic apostrophes, not `'`;
 *   • no CJK in the English-first default UI;
 *   • the honesty line (01 §5): things that are MEASURED may be stated as measured; things that are
 *     TRADITION are stated as tradition. Nothing in this feature may claim to measure mood, energy,
 *     health, or the future from a hand.
 *
 * Source-text assertions again, and for the same reason as the check-in gate: the property is about
 * strings that must not exist, and absence has no runtime behaviour to observe.
 */
declare function require(id: string): unknown;
declare const __dirname: string;

interface DirEnt {
  isFile(): boolean;
  isDirectory(): boolean;
  name: string;
}
const { readdirSync, readFileSync } = require('fs') as {
  readdirSync(p: string, o: { withFileTypes: true }): DirEnt[];
  readFileSync(p: string, encoding: 'utf8'): string;
};
const { join } = require('path') as { join(...parts: string[]): string };

const SRC = join(__dirname, '..', '..', '..');
/** Every directory Audit-5 touched that renders user-facing copy. */
const DIRS = [join(SRC, 'features', 'pulse'), join(SRC, 'features', 'checkin')];

function filesIn(dir: string): { path: string; name: string; body: string }[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.generated.ts'))
    .map((e) => ({ path: join(dir, e.name), name: e.name, body: readFileSync(join(dir, e.name), 'utf8') }));
}

const files = DIRS.flatMap(filesIn);

/**
 * Every opening `<Name …>` tag, scanned with brace awareness.
 *
 * A regex cannot do this: `<Pressable[\s\S]*?>` stops at the `>` inside the first `=>` arrow, which
 * silently truncates every tag carrying a handler — i.e. exactly the tags this gate exists to check.
 */
function openingTags(body: string, name: string): string[] {
  const out: string[] = [];
  const open = `<${name}`;
  for (let i = body.indexOf(open); i !== -1; i = body.indexOf(open, i + 1)) {
    let depth = 0;
    for (let j = i; j < body.length; j++) {
      const ch = body[j];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>' && depth === 0 && body[j - 1] !== '=') {
        out.push(body.slice(i, j + 1));
        break;
      }
    }
  }
  return out;
}

/**
 * The strings a user can actually read: JSX text nodes and the string literals passed to `label` /
 * `accessibilityLabel` / `placeholder`, plus anything a copy helper returns. Comments and identifiers
 * are excluded — `pulse` is the module namespace, and flagging its own filename would make the gate
 * useless noise.
 */
function userFacingStrings(body: string): string[] {
  const withoutComments = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const out: string[] = [];
  // JSX text between tags, e.g. `>Hold to reveal<`
  for (const m of withoutComments.matchAll(/>\s*([A-Z][^<>{}\n]{3,})\s*</g)) out.push(m[1]);
  // label / accessibilityLabel / accessibilityHint / title props and returned copy strings
  for (const m of withoutComments.matchAll(/(?:label|accessibilityLabel|accessibilityHint|title|placeholder)=\{?['"`]([^'"`]{3,})['"`]/g)) out.push(m[1]);
  // template + plain string literals that read like sentences (start with a capital, contain a space)
  for (const m of withoutComments.matchAll(/['"`]([A-Z][^'"`\n]*\s[^'"`\n]{3,})['"`]/g)) out.push(m[1]);
  return out;
}

describe('Audit-5 copy gate', () => {
  it('has copy to check (the extractor is not silently matching nothing)', () => {
    const all = files.flatMap((f) => userFacingStrings(f.body));
    expect(files.length).toBeGreaterThanOrEqual(10);
    expect(all.length).toBeGreaterThan(20);
  });

  it('never shows the dev codename "pulse" to a user (02 §9)', () => {
    const offenders: string[] = [];
    for (const f of files) {
      for (const s of userFacingStrings(f.body)) {
        if (/\bpulse\b/i.test(s)) offenders.push(`${f.name}: "${s}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('uses typographic apostrophes in user-facing copy', () => {
    const offenders: string[] = [];
    for (const f of files) {
      for (const s of userFacingStrings(f.body)) {
        // A straight apostrophe between letters is a contraction/possessive that should be curly.
        if (/[A-Za-z]'[A-Za-z]/.test(s)) offenders.push(`${f.name}: "${s}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('renders no CJK — the default UI is English-first', () => {
    const offenders: string[] = [];
    for (const f of files) {
      for (const s of userFacingStrings(f.body)) {
        if (/[　-〿㐀-䶿一-鿿]/.test(s)) offenders.push(`${f.name}: "${s}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('makes no measurement claim about mood, energy, health, or the future (01 §5)', () => {
    // The ritual measures ONE thing — hand SHAPE, to confirm it is the same hand — and says so.
    // Anything that implied it read a state from the palm would be the pseudo-measurement creep the
    // strategy names as its own top honesty risk.
    const banned = [
      /\bmeasur\w* your (mood|energy|stress|health|vitality|wellbeing)/i,
      /\byour (energy|mood|stress) (level|today|reading)\b/i,
      /\bscan(ning|s|ned)? your (aura|energy|mood|health)\b/i,
      /\bdetect\w* your (mood|energy|stress|health)\b/i,
      /\bpredicts?\b/i,
      /\bwill happen\b/i,
      /\bguarantee\w*\b/i,
    ];
    const offenders: string[] = [];
    for (const f of files) {
      for (const s of userFacingStrings(f.body)) {
        for (const re of banned) if (re.test(s)) offenders.push(`${f.name}: "${s}" (${re})`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('states the ONE thing the ritual really measures, in checkable words', () => {
    const checkin = files.find((f) => f.name === 'checkin.ts')!.body;
    // "your lines hold" is a claim about the hand's own geometry being unchanged — measured, and
    // true. It is allowed precisely because it is the measured thing.
    expect(checkin).toMatch(/Your lines hold/);
    expect(checkin).toMatch(/No photo is taken, nothing is uploaded/);
  });

  it('gives every interactive control an accessibility label', () => {
    const offenders: string[] = [];
    for (const f of files) {
      for (const tag of openingTags(f.body.replace(/\/\*[\s\S]*?\*\//g, ''), 'Pressable')) {
        // The stop-propagation wrapper inside a sheet is not a control — it exists so a tap on the
        // sheet body does not reach the dismiss scrim behind it, and labelling it would announce a
        // button that does nothing.
        const isNoopWrapper = /onPress=\{\(\)\s*=>\s*\{\}\}/.test(tag);
        if (!isNoopWrapper && !/accessibilityLabel/.test(tag)) offenders.push(`${f.name}: ${tag.slice(0, 70)}…`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
