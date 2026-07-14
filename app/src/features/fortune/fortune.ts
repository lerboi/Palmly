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
