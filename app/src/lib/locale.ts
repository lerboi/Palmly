import { getLocales } from 'expo-localization';

/**
 * The user's primary BCP-47 locale tag (e.g. `en-US`, `zh-Hans-CN`) for `Intl` date/number
 * formatting — the localization foundation (audit §6 / spec §7 "from day one"). Replaces hardcoded
 * `'en-US'`: pass this to `toLocaleDateString`/`Intl.*` so dates read in the user's own locale.
 * Falls back to `undefined` (the JS runtime default) if the OS locale can't be resolved.
 */
export function deviceLocale(): string | undefined {
  try {
    return getLocales()[0]?.languageTag ?? undefined;
  } catch {
    return undefined;
  }
}
