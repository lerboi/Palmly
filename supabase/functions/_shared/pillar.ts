// Day-pillar bucketing (Backend §10, mvp_spec §8 — deliberately "lightweight BaZi-lite", not a full
// BaZi module). A birth date maps to its sexagenary DAY PILLAR (干支) — the continuous 60-day 甲子
// cycle, which is independent of solar terms (unlike the month/year pillars, so no almanac lookup
// needed). That gives exactly ~60 stable buckets; daily fortunes are generated per
// (fortune_date × pillar_bucket × locale) and each user reads the one matching their birth pillar.
// Deterministic + pure → unit-testable. A missing/invalid birth date falls back to a generic bucket
// so fortunes still render for users who skip it.

const STEM_CN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const STEM_PY = ['jia', 'yi', 'bing', 'ding', 'wu', 'ji', 'geng', 'xin', 'ren', 'gui'];
const STEM_ELEMENT = ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'] as const;
const BRANCH_CN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const BRANCH_PY = ['zi', 'chou', 'yin', 'mao', 'chen', 'si', 'wu', 'wei', 'shen', 'you', 'xu', 'hai'];

export const GENERIC_BUCKET = 'generic';

/** Julian Day Number (at noon) for a proleptic-Gregorian date. */
function gregorianToJDN(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

export interface DayPillar {
  index: number; // 0–59 in the sexagenary cycle (0 = 甲子)
  day_master: string; // the day's Heavenly Stem (日主) — the core element carrier
  element: 'wood' | 'fire' | 'earth' | 'metal' | 'water';
  yin_yang: 'yang' | 'yin';
  day_pillar: string; // 干支, e.g. 甲子
  bucket: string; // pinyin day-pillar, the fortune key (e.g. 'jiazi'); unique per cycle position
}

/** Parse a YYYY-MM-DD birth date → its sexagenary day pillar, or null if unparseable. */
export function dayPillar(birthDate: string | null | undefined): DayPillar | null {
  if (!birthDate) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const jdn = gregorianToJDN(y, mo, d);
  // anchor: 2000-01-07 (JDN 2451551) is a 甲子 day → (jdn + 49) mod 60 == 0 there.
  const index = (((jdn + 49) % 60) + 60) % 60;
  const s = index % 10;
  const b = index % 12;
  return {
    index,
    day_master: STEM_CN[s],
    element: STEM_ELEMENT[s],
    yin_yang: s % 2 === 0 ? 'yang' : 'yin',
    day_pillar: STEM_CN[s] + BRANCH_CN[b],
    bucket: STEM_PY[s] + BRANCH_PY[b],
  };
}

/** The fortune bucket for a birth date — one of 60 sexagenary buckets, or the generic bucket. */
export const pillarBucket = (birthDate: string | null | undefined): string => dayPillar(birthDate)?.bucket ?? GENERIC_BUCKET;

export interface BucketInfo {
  bucket: string;
  element: DayPillar['element'] | 'generic';
  day_pillar: string;
}

/** The full set fortune-generate writes against: the 60 sexagenary buckets + the generic bucket. */
export function allPillarBuckets(): BucketInfo[] {
  const out: BucketInfo[] = [];
  for (let idx = 0; idx < 60; idx++) {
    const s = idx % 10;
    const b = idx % 12;
    out.push({ bucket: STEM_PY[s] + BRANCH_PY[b], element: STEM_ELEMENT[s], day_pillar: STEM_CN[s] + BRANCH_CN[b] });
  }
  out.push({ bucket: GENERIC_BUCKET, element: 'generic', day_pillar: '' });
  return out;
}

/** The jsonb stored on profiles.element_profile at birth-date capture. */
export function elementProfile(birthDate: string | null | undefined): Record<string, unknown> {
  const p = dayPillar(birthDate);
  if (!p) return { bucket: GENERIC_BUCKET };
  return { day_master: p.day_master, element: p.element, yin_yang: p.yin_yang, day_pillar: p.day_pillar, day_pillar_index: p.index, bucket: p.bucket };
}
