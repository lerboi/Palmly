// palette.ts — the ONE shared server palette (audit §3.3: untested `_shared`).
//
// palette.ts exists because two server surfaces (the share-card SVG and the invite HTML) used to
// keep their own copies and drifted apart. Its own header says "a future re-skin is a one-file edit
// here" — which is exactly why it deserves a test: the next re-skin will edit these hexes, and
// nothing currently notices if that edit ships an unreadable colour or drops a role.
//
// The contrast assertions use an INDEPENDENT oracle: palette.ts stores hexes and computes nothing,
// so relative luminance is implemented here from the WCAG 2.x definition rather than borrowed from
// the module under test. A comment claiming "4.81:1 AA" is not evidence; this recomputes it.
import { assert, assertEquals } from '@std/assert';
import { DARK, LIGHT, withAlpha, type ServerPalette } from './palette.ts';

// ── WCAG 2.x relative luminance + contrast ratio, from the spec, not from the code under test ────
function luminance(hex: string): number {
  const c = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}
function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const ROLES: (keyof ServerPalette)[] = [
  'bg', 'surface', 'surfaceSunken', 'border', 'ink', 'inkWash', 'inkFaint',
  'accent', 'accentPressed', 'accentMuted', 'onAccent', 'heritage', 'premium', 'success',
];

Deno.test('palette: the oracle agrees with WCAG on known reference pairs', () => {
  // Sanity-check the instrument BEFORE trusting it to judge the palette: black-on-white is exactly
  // 21:1 and any colour against itself is exactly 1:1. If these drift, every assertion below is
  // measuring the wrong thing.
  assertEquals(Math.round(contrast('#000000', '#FFFFFF') * 100) / 100, 21);
  assertEquals(contrast('#D13B27', '#D13B27'), 1);
});

Deno.test('palette: LIGHT and DARK each define every role — no undefined into an SVG', () => {
  // A missing role does not throw; it interpolates as the string "undefined" into the card SVG or
  // the invite page's CSS, which renders as a silently broken colour rather than an error.
  for (const [name, p] of [['LIGHT', LIGHT], ['DARK', DARK]] as const) {
    for (const role of ROLES) {
      const v = p[role];
      assert(typeof v === 'string' && v.length > 0, `${name}.${role} is missing`);
      assert(/^#[0-9A-Fa-f]{6}$/.test(v), `${name}.${role} = ${v} is not a #RRGGBB hex`);
    }
    assertEquals(Object.keys(p).sort(), [...ROLES].sort(), `${name} has exactly the declared roles`);
  }
});

Deno.test('palette: every text role the server surfaces actually RENDER meets WCAG AA', () => {
  // Scoped to what is painted. `ink` (11 uses) and `inkWash` (6) are rendered by card-svg.ts and
  // invite-page.ts; asserting AA on a role nothing draws would be measuring a colour no human sees.
  for (const [name, p] of [['LIGHT', LIGHT], ['DARK', DARK]] as const) {
    assert(contrast(p.ink, p.bg) >= 4.5, `${name}: ink on bg is ${contrast(p.ink, p.bg).toFixed(2)}:1, need 4.5`);
    assert(contrast(p.ink, p.surface) >= 4.5, `${name}: ink on surface is ${contrast(p.ink, p.surface).toFixed(2)}:1`);
    assert(contrast(p.inkWash, p.bg) >= 4.5, `${name}: inkWash on bg is ${contrast(p.inkWash, p.bg).toFixed(2)}:1`);
    assert(contrast(p.inkWash, p.surface) >= 4.5, `${name}: inkWash on surface is ${contrast(p.inkWash, p.surface).toFixed(2)}:1`);
  }
});

Deno.test('palette: inkFaint is UNUSED — and must not be adopted for text as it stands', () => {
  // Recorded rather than "fixed", because fixing it would mean re-picking a designed colour to
  // satisfy a test I just wrote, for a role nothing renders. Two true things about it:
  //   * LIGHT.inkFaint on bg measures 2.66:1 — below AA (4.5) AND below the 3:1 large-text bar.
  //   * It does not mirror the app's textTertiary (#8A8375) the way the header claims; #9A9AA0 is
  //     a leftover from the archived indigo skin. Inert only because nothing draws it.
  // So this is a tripwire: the day someone reaches for inkFaint, this fails and points at why.
  assert(contrast(LIGHT.inkFaint, LIGHT.bg) < 3, 'if inkFaint were deepened to pass AA, retire this tripwire');
  assertEquals(Math.round(contrast(LIGHT.inkFaint, LIGHT.bg) * 100) / 100, 2.66);
});

Deno.test('palette: onAccent over accent meets AA — the CTA is the one that must not fail', () => {
  // V22 deepened LIGHT.accent from #D8402C to #D13B27 specifically to clear AA (recorded as 4.81:1).
  // That number was measured once, by hand, and then trusted forever. This recomputes it every run,
  // so a re-skin that reverts the deepening fails here instead of shipping.
  const light = contrast(LIGHT.onAccent, LIGHT.accent);
  assert(light >= 4.5, `LIGHT: onAccent on accent is ${light.toFixed(2)}:1, need 4.5`);
  assertEquals(Math.round(light * 100) / 100, 4.81, 'the V22 contrast audit recorded 4.81:1 — recomputed independently');

  const dark = contrast(DARK.onAccent, DARK.accent);
  assert(dark >= 4.5, `DARK: onAccent on accent is ${dark.toFixed(2)}:1, need 4.5`);

  // the pressed state is still a CTA with the same text on it
  assert(contrast(LIGHT.onAccent, LIGHT.accentPressed) >= 4.5, 'LIGHT: onAccent on accentPressed');
  assert(contrast(DARK.onAccent, DARK.accentPressed) >= 4.5, 'DARK: onAccent on accentPressed');
});

Deno.test('palette: the two skins are genuinely distinct and correctly oriented', () => {
  // A copy-paste that left DARK equal to LIGHT would pass every contrast assertion above.
  assert(LIGHT.bg !== DARK.bg && LIGHT.ink !== DARK.ink && LIGHT.accent !== DARK.accent);
  assert(luminance(LIGHT.bg) > 0.5, 'LIGHT.bg is a light field');
  assert(luminance(DARK.bg) < 0.1, 'DARK.bg is a dark field');
  assert(luminance(LIGHT.ink) < luminance(LIGHT.bg), 'LIGHT: dark ink on light paper');
  assert(luminance(DARK.ink) > luminance(DARK.bg), 'DARK: light ink on dark field');
});

Deno.test('withAlpha: #RRGGBB + alpha → rgba(), with or without the hash', () => {
  assertEquals(withAlpha('#D13B27', 0.25), 'rgba(209,59,39,0.25)');
  assertEquals(withAlpha('D13B27', 0.25), 'rgba(209,59,39,0.25)', 'the hash is optional');
  assertEquals(withAlpha('#000000', 0), 'rgba(0,0,0,0)');
  assertEquals(withAlpha('#FFFFFF', 1), 'rgba(255,255,255,1)');
  // lowercase hex is valid CSS and must parse identically
  assertEquals(withAlpha('#ff7c63', 0.5), withAlpha('#FF7C63', 0.5));
  // it is used to tint shadows from a role hex — the real call shape
  assertEquals(withAlpha(LIGHT.accent, 0.18), 'rgba(209,59,39,0.18)');
});
