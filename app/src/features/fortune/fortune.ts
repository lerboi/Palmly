// Daily fortune (Backend §3.2/§10, UIUX §2.11). Almanac-style content generated per
// (date × pillar_bucket × locale); the free tier shows `overall`, premium expands the rest (U4).
import { deviceLocale } from '@/lib/locale';

export interface Fortune {
  overall: string;
  career: string;
  love: string;
  wealth: string;
  dos: string[];
  donts: string[];
  lucky_direction: string;
  lucky_color: string;
  lucky_hours: string;
}

// ── Almanac date header: Gregorian + the sexagenary "ganzhi" day pillar for that date. The CJK
//    stem/branch data below is retained only for the optional zh "traditional view" (not rendered
//    in the English-first default UI, per redesign §2). ──
const STEM_CN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCH_CN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function gregorianToJDN(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

function pillarIndex(date: Date): number {
  const jdn = gregorianToJDN(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return (((jdn + 49) % 60) + 60) % 60;
}

// ── Birth-date → fortune bucket (audit F1.3). Mirrors supabase/functions/_shared/pillar.ts EXACTLY
//    so the client reads the same `fortune_templates` row the backend generated. Parses the
//    YYYY-MM-DD components directly (no timezone drift), keyed on the pinyin day pillar. ──
const STEM_PY = ['jia', 'yi', 'bing', 'ding', 'wu', 'ji', 'geng', 'xin', 'ren', 'gui'];
const BRANCH_PY = ['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai'];
const STEM_ELEMENT = ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'] as const;
export const GENERIC_BUCKET = 'generic';

/** The 0–59 sexagenary index for a YYYY-MM-DD birth date, or null if unparseable. */
function birthPillarIndex(birthDate: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const jdn = gregorianToJDN(y, mo, d);
  return (((jdn + 49) % 60) + 60) % 60;
}

/** The fortune bucket for a birth date — the pinyin day pillar (e.g. 'jiazi'), or the generic bucket. */
export function pillarBucket(birthDate: string | null | undefined): string {
  if (!birthDate) return GENERIC_BUCKET;
  const idx = birthPillarIndex(birthDate);
  if (idx === null) return GENERIC_BUCKET;
  return STEM_PY[idx % 10] + BRANCH_PY[idx % 12];
}

/** The jsonb stored on `profiles.element_profile` at birth-date capture (mirrors the backend). */
export function elementProfile(birthDate: string | null | undefined): Record<string, unknown> {
  const idx = birthDate ? birthPillarIndex(birthDate) : null;
  if (idx === null) return { bucket: GENERIC_BUCKET };
  const s = idx % 10;
  return { element: STEM_ELEMENT[s], yin_yang: s % 2 === 0 ? 'yang' : 'yin', day_pillar_index: idx, bucket: STEM_PY[s] + BRANCH_PY[idx % 12] };
}

/** The ganzhi day pillar (stem+branch) for a calendar date — same anchor as the backend `dayPillar`. */
export function dayPillarCn(date: Date): string {
  const index = pillarIndex(date);
  return STEM_CN[index % 10] + BRANCH_CN[index % 12];
}

// English-first romanization of the day pillar — the stem's element + the branch's zodiac animal
// (redesign §2: the ganzhi is surfaced as an English "whisper", never the CJK glyphs).
const STEM_EL = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water'];
const BRANCH_ANIMAL = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
/** English day-pillar whisper, e.g. "Wood Rat" — for the almanac header (no CJK). */
export function dayPillarEn(date: Date): string {
  const index = pillarIndex(date);
  return `${STEM_EL[index % 10]} ${BRANCH_ANIMAL[index % 12]}`;
}

export interface AlmanacDate {
  weekday: string; // "Monday"
  gregorian: string; // "July 14"
  pillarEn: string; // English whisper, e.g. "Wood Rat" (rendered as the day-pillar whisper)
}
export function almanacDate(date: Date, locale: string | undefined = deviceLocale()): AlmanacDate {
  return {
    weekday: date.toLocaleDateString(locale, { weekday: 'long' }),
    gregorian: date.toLocaleDateString(locale, { month: 'long', day: 'numeric' }),
    pillarEn: dayPillarEn(date),
  };
}

/**
 * Clockwise bearing in degrees for each lucky direction, applied to the `compass` icon's `rotate`
 * (the icon is drawn pointing North). Replaces the old ↑↗→↘↓↙←↖ text-glyph map — and with it the
 * leading-space bug, where an unmapped direction rendered as `' Southeast'` (Audit-4 CO-8).
 * An unmapped value returns `undefined`, and the call site renders the label with no icon.
 */
export const DIRECTION_BEARING: Record<string, number> = {
  North: 0,
  Northeast: 45,
  East: 90,
  Southeast: 135,
  South: 180,
  Southwest: 225,
  West: 270,
  Northwest: 315,
};

/** What Today should render right now. Resolved in ONE place so the precedence can be tested. */
export type HomeState = 'loading' | 'error' | 'firstRun' | 'ready';

/**
 * Decide Today's state (Audit-4 SH-1). The old expression was `firstRun || !fortune`, which
 * collapsed three different situations into the first-run hero:
 *   - still loading      → "Read my palm" flashed at every returning user, every open;
 *   - the fetch failed   → "Read my palm" showed FOREVER, routing a 12-reading user into capture;
 *   - genuinely new      → correct, but indistinguishable from the two above.
 *
 * Precedence: loading and error are about the REQUEST and win first; `firstRun` is about the USER
 * and must be known independently (has any reading ever completed?), never inferred from a missing
 * fortune.
 *
 * A missing fortune row on an otherwise-ready screen resolves to `error` — the retry card. That is
 * still the honest answer ("today's reading isn't loading"), and crucially it is NOT the first-run
 * hero, which would tell a user with a dozen readings that they have never had one.
 */
export function homeState(input: {
  loading?: boolean;
  /**
   * The entitlement read is still in flight. Counts as loading (Audit-4 SH-2): entitlements
   * default to `premium: false` while resolving, so rendering the ready branch early flashed the
   * LOCKED fortune card at paying users on every single open.
   */
  entitlementLoading?: boolean;
  error?: boolean;
  firstRun?: boolean;
  fortune?: Fortune | null;
}): HomeState {
  if (input.loading || input.entitlementLoading) return 'loading';
  if (input.error) return 'error';
  if (input.firstRun) return 'firstRun';
  if (!input.fortune) return 'error';
  return 'ready';
}

/**
 * Should the birth-date sheet be offered right now? (Audit-4 SH-4.)
 *
 * The old rule was "no birth date → show it", evaluated before anything rendered, so a brand-new
 * user met a full-screen form BEFORE seeing a single fortune, and — because Skip persisted nothing
 * — met it again on every open forever.
 *
 * The rule now: only after the fortune is actually on screen (value first), only if we don't have
 * a birth date, and never again once they have declined. `undefined` inputs mean "not yet known",
 * which must not show the sheet — asking during a load is the same rudeness as asking too early.
 */
export function shouldAskBirthDate(input: {
  fortuneReady: boolean;
  birthDate?: string | null;
  skipped?: boolean;
}): boolean {
  if (!input.fortuneReady) return false;
  if (input.skipped !== false) return false; // undefined = still resolving → don't ask yet
  return !input.birthDate;
}

