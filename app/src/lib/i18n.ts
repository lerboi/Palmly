/**
 * The message catalog + `t()` accessor — the localization foundation (audit §6 / spec §7 "from day
 * one"). Values are ICU-style patterns (`{var}` placeholders) with English as the source locale;
 * other locales layer on later — the migration is MECHANICAL, don't translate now.
 *
 * Migrating a surface means: move its literal strings here and call `t('key', vars)` at the site, so
 * (a) every user-facing string lives in one catalog and (b) the pseudo-locale can expand them to
 * surface truncation/clipping before any real translation exists. Started with the tightest spot —
 * capture guidance (single-line instruction pills, §2.3); onboarding + notif-adjacent copy are next.
 *
 * Formatting is deliberately lightweight `{name}` substitution (the migrated strings have no
 * plural/select). See the Decision Log for the `intl-messageformat` upgrade path — jest-expo cannot
 * transform its ESM without a brittle `transformIgnorePatterns` override, so the ICU lib is deferred
 * until a pluralized string actually needs it.
 */
export const messages = {
  'capture.searching.palm': 'Hold your {handSide} palm up to the camera',
  'capture.searching.face': 'Center your face in the frame',
  'capture.too_far': 'Move closer',
  'capture.too_close': 'A little further',
  'capture.not_flat': 'Flatten your hand, fingers relaxed',
  'capture.tilted.palm': 'Face your palm to the camera',
  'capture.tilted.face': 'Face the camera straight on',
  'capture.dark': 'Find a little more light',
  'capture.ready': 'Hold still…',
  'capture.captured': 'Got it',
  'capture.review': 'Looks sharp',
} as const;

export type MessageKey = keyof typeof messages;

// Pseudo-locale (audit §6): a build flag that expands + accents every rendered string (~+40% width)
// to surface truncation/clipping BEFORE real translation exists — the localization equivalent of the
// `EXPO_PUBLIC_FORCE_SCHEME` screenshot flag. Bake with `EXPO_PUBLIC_PSEUDO_LOCALE=1 npx expo export`.
// Off in every normal build and in all tests.
const PSEUDO = process.env.EXPO_PUBLIC_PSEUDO_LOCALE === '1';

const ACCENT: Record<string, string> = {
  a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', n: 'ñ', c: 'ç', s: 'š', y: 'ý', r: 'ŕ', t: 'ţ', d: 'đ',
  A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú', N: 'Ñ', C: 'Ç',
};

/** Accent the letters and pad ~+40% so a layout that only fits English visibly overflows here. */
export function pseudoLocalize(s: string): string {
  const accented = s.replace(/[a-zA-Z]/g, (ch) => ACCENT[ch] ?? ch);
  const visibleLen = s.replace(/\s+/g, '').length;
  const pad = '·'.repeat(Math.max(2, Math.ceil(visibleLen * 0.4)));
  return `⟦${accented} ${pad}⟧`;
}

/** Interpolate `{name}` placeholders from `vars`; unknown placeholders are left intact. */
function format(pattern: string, vars?: Record<string, string | number>): string {
  if (!vars) return pattern;
  return pattern.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

/** Resolve a catalog message, interpolate `vars`, and apply the pseudo-locale when the flag is on. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const out = format(messages[key], vars);
  return PSEUDO ? pseudoLocalize(out) : out;
}
