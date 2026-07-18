// Daily fortune (Backend §3.2/§10, UIUX §2.11). Almanac-style content generated per
// (date × pillar_bucket × locale); the free tier shows `overall`, premium expands the rest (U4).

export interface Fortune {
  overall: string;
  career: string;
  love: string;
  wealth: string;
  do: string[];
  dont: string[];
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
  pillar: string; // ganzhi day pillar, e.g. "甲子日" (zh traditional view only; not rendered)
  pillarEn: string; // English whisper, e.g. "Wood Rat" (rendered as the day-pillar whisper)
}
export function almanacDate(date: Date): AlmanacDate {
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
    gregorian: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
    pillar: `${dayPillarCn(date)}日`,
    pillarEn: dayPillarEn(date),
  };
}

/** Compass glyph for a lucky direction (the eight compass points). */
export const DIRECTION_ARROW: Record<string, string> = {
  North: '↑',
  Northeast: '↗',
  East: '→',
  Southeast: '↘',
  South: '↓',
  Southwest: '↙',
  West: '←',
  Northwest: '↖',
};

export const PREVIEW_FORTUNE: Fortune = {
  overall: 'A steady, favourable day — move with intention and doors open quietly.',
  career: 'Progress through patience; a senior notices your reliability.',
  love: 'Warmth returned in kind. Say the honest thing.',
  wealth: 'Hold, don’t chase — a small saving beats a big gamble.',
  do: ['Sign what’s ready', 'Reach out first', 'Tidy one loose end'],
  dont: ['Lend impulsively', 'Argue over trifles', 'Skip your rest'],
  lucky_direction: 'Southeast',
  lucky_color: 'Jade green',
  lucky_hours: '7–9am · 3–5pm',
};
