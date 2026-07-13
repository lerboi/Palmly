// Compatibility scorer (Backend §7) — DETERMINISTIC code, no model. Two people comparing their
// cards must see the same number every time (P1 trust), and it must be reproducible for support.
// Maps both members' canonical palm `feature_sets` to 5 sub-scores + a weighted composite using
// 手相-appropriate pairings: hand-element interaction, heart-line emotional style, head-line
// cognitive style, life-line energy rhythm, fate-line direction. Symmetric in (a,b). Tuned so the
// composite over random pairs right-skews (most 55–85, rare-but-real lows) — entertainment skews
// warm for shareable variance. The Gemini narrative (worker-compat) explains the number, never
// chooses it.

export const COMPAT_ALGORITHM_VERSION = 'compat.v1';

type Rec = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const clamp = (n: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, n));

export interface SubScores {
  emotion: number;
  mind: number;
  life_energy: number;
  destiny: number;
  elements: number;
}
export interface CompatScore {
  sub_scores: SubScores;
  composite: number;
  algorithm_version: string;
}

// ── Hand-element interaction (the palm's 4 elemental hands + mixed). Symmetric affinity 0–100:
// like-element = strong affinity; "fuel"/"nurture" pairs high; "steam"/"dust" clashes = friction
// (low but never zero — sparks are shareable); mixed adapts to anything. (UIUX §3: "Fire meets
// Water — sparks and steam.") The spec's 五行 framing, applied to the schema's hand_shape enum.
const ELEMENT_AFFINITY: Record<string, Record<string, number>> = {
  earth: { earth: 84, water: 92, fire: 52, air: 36, mixed: 70 },
  water: { earth: 92, water: 84, fire: 30, air: 60, mixed: 70 },
  fire: { earth: 52, water: 30, fire: 84, air: 92, mixed: 70 },
  air: { earth: 36, water: 60, fire: 92, air: 84, mixed: 70 },
  mixed: { earth: 70, water: 70, fire: 70, air: 70, mixed: 78 },
};
const elementScore = (a?: string, b?: string): number => (a && b ? (ELEMENT_AFFINITY[a]?.[b] ?? 70) : 70);

// Ordinal maps for line descriptors (low → high intensity).
const DEPTH = { faint: 0, moderate: 1, deep: 2 } as Record<string, number>;
const CURVE = { straight: 0, gently_curved: 1, strongly_curved: 2 } as Record<string, number>;
const LENGTH = { short: 0, medium: 1, long: 2 } as Record<string, number>;

/** Resonance: matching descriptors resonate (high), opposite ones create friction (still warm). */
const resonance = (a: number | undefined, b: number | undefined): number => {
  if (a === undefined || b === undefined) return 72;
  return 92 - Math.abs(a - b) * 25; // diff 0→92, 1→67, 2→42
};

/** Complement: a moderate difference is a plus (styles that balance), same is fine, extremes taper. */
const complement = (a: number | undefined, b: number | undefined): number => {
  if (a === undefined || b === undefined) return 72;
  const d = Math.abs(a - b);
  return d === 1 ? 86 : d === 0 ? 72 : 58;
};

const ord = (line: Rec | undefined, key: string, map: Record<string, number>): number | undefined => {
  const v = str(line?.[key]);
  return v === undefined ? undefined : map[v];
};

const avg = (xs: number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length;

function emotionScore(a: Rec, b: Rec): number {
  const ha = a.heart_line as Rec | undefined;
  const hb = b.heart_line as Rec | undefined;
  return avg([
    resonance(ord(ha, 'depth', DEPTH), ord(hb, 'depth', DEPTH)),
    resonance(ord(ha, 'curvature', CURVE), ord(hb, 'curvature', CURVE)),
    resonance(ord(ha, 'length', LENGTH), ord(hb, 'length', LENGTH)),
  ]);
}

function mindScore(a: Rec, b: Rec): number {
  const ha = a.head_line as Rec | undefined;
  const hb = b.head_line as Rec | undefined;
  // curvature = thinking style (practical↔imaginative) → a complement is a plus; depth/length resonate
  return avg([
    complement(ord(ha, 'curvature', CURVE), ord(hb, 'curvature', CURVE)),
    resonance(ord(ha, 'depth', DEPTH), ord(hb, 'depth', DEPTH)),
    resonance(ord(ha, 'length', LENGTH), ord(hb, 'length', LENGTH)),
  ]);
}

function lifeEnergyScore(a: Rec, b: Rec): number {
  const la = a.life_line as Rec | undefined;
  const lb = b.life_line as Rec | undefined;
  return avg([
    resonance(ord(la, 'depth', DEPTH), ord(lb, 'depth', DEPTH)),
    resonance(ord(la, 'curvature', CURVE), ord(lb, 'curvature', CURVE)),
  ]);
}

function destinyScore(a: Rec, b: Rec): number {
  const present = (f: Rec): string => str((f.fate_line as Rec | undefined)?.present) ?? 'absent';
  const pa = present(a);
  const pb = present(b);
  const clear = (p: string) => p === 'clear';
  const absent = (p: string) => p === 'absent';
  if (clear(pa) && clear(pb)) return 88; // two strong, shared sense of direction
  if (absent(pa) && absent(pb)) return 76; // two self-authored paths — freely aligned
  if (clear(pa) !== clear(pb)) return 60; // one driven, one open — asymmetric but workable
  return 70; // faint / mixed
}

const WEIGHTS: Record<keyof SubScores, number> = { elements: 0.24, emotion: 0.26, mind: 0.2, life_energy: 0.15, destiny: 0.15 };

/** Deterministic, symmetric compatibility score for two canonical palm feature sets. */
export function scorePair(a: Rec, b: Rec): CompatScore {
  const sub: SubScores = {
    elements: Math.round(elementScore(str(a.hand_shape), str(b.hand_shape))),
    emotion: Math.round(emotionScore(a, b)),
    mind: Math.round(mindScore(a, b)),
    life_energy: Math.round(lifeEnergyScore(a, b)),
    destiny: Math.round(destinyScore(a, b)),
  };
  const raw = (Object.keys(WEIGHTS) as (keyof SubScores)[]).reduce((s, k) => s + WEIGHTS[k] * sub[k], 0);
  return { sub_scores: sub, composite: clamp(Math.round(raw)), algorithm_version: COMPAT_ALGORITHM_VERSION };
}
