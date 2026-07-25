import type { LineGeometry } from '@/components/palm-diagram/geometry';
import type { IconName } from '@/components/ui';
import { CANONICAL_DELETION_BADGE, CANONICAL_PHOTO_KEPT } from '@/lib/trustCopy';
import type { ReadingKind, RevealState } from './RevealView';

/** A stored reading's narrative (Backend §6.3 / `reading_sections.v1`). */
export interface ReadingSection {
  key: string;
  title: string;
  body: string;
  depth_level: number; // 1 = free, ≥2 = premium (locked)
  tags: string[];
  feature_refs?: string[];
  // NOTE: there is deliberately no `teaser` field (audit M12a, Decision Log D-25).
  // `reading_sections.v1.json` is `additionalProperties: false`, so Ajv rejects any section
  // carrying one — the server could never send it. And it should not: depth-2 prose is generated
  // only ON UNLOCK (§NOT YET BUILT C.12), so before purchase there is no locked prose to tease
  // FROM. A field that can only ever be filled by premium prose is an invitation to ship exactly
  // the leak the finding warns about. The locked card teases with the section's real `title`,
  // which is code-derived from the deterministic claim skeleton and costs nothing.
}
export interface Reading {
  headline: string;
  summary?: string;
  sections: ReadingSection[];
  disclaimer?: string;
}

/** The palm line a narrative section highlights in cinnabar (undefined → the section is not about a
 *  single line, and shows a feature icon from {@link SECTION_ICON} instead). */
export const SECTION_LINE: Record<string, string | undefined> = {
  heart: 'heart_line',
  head: 'head_line',
  life: 'life_line',
  fate: 'fate_line',
  hand_shape: undefined,
  mounts: undefined,
  markings: undefined,
};

/**
 * The feature icon a **non-line** palm section shows in place of the mini diagram (Audit-4 CO-5,
 * Direction §4.4 #2).
 *
 * Before this, `SECTION_LINE` returned `undefined` for these three and the card fell through to a
 * mini palm with nothing highlighted — so hand shape, mounts and markings rendered the *same grey
 * palm as each other*, three interchangeable thumbs on one page. A section about the mounts should
 * not look like a section about the markings.
 */
export const SECTION_ICON: Record<string, IconName> = {
  hand_shape: 'palm',
  mounts: 'elements',
  markings: 'sparkle',
};

/**
 * The CJK marker for each section (heart/head/life/fate …). Redesign §2: **NOT rendered in the
 * default UI** — RevealView uses the English feature line-icons (`SECTION_ICON`). Retained as data
 * for the optional zh "traditional view" only.
 */
export const SECTION_GLYPH: Record<string, string> = {
  hand_shape: '掌',
  heart: '心',
  head: '智',
  life: '命',
  fate: '运',
  mounts: '丘',
  markings: '纹',
};

export const freeSections = (r: Reading): ReadingSection[] => r.sections.filter((s) => s.depth_level <= 1);
export const lockedSections = (r: Reading): ReadingSection[] => r.sections.filter((s) => s.depth_level >= 2);

/**
 * A NAMED classical concept per section (audit F1.1 — the authenticity signal the no-CJK decision
 * removed). Each cites a real palmistry/physiognomy term in English, no CJK, no health claims.
 */
const TRADITION_CONCEPT: Record<string, string> = {
  heart: 'The tradition reads a long, curving heart line as the sign of the open heart.',
  head: 'A straight, even head line is what old readers call the practical mind.',
  life: 'A wide life line sweeps the Mount of Venus — the tradition’s vital arc.',
  fate: 'An unbroken fate line is the Saturn line — the mark of a self-made path.',
  hand_shape: 'Hand shape is the first reading — earth, air, fire, or water, the four classical hands.',
  mounts: 'The raised pads are the mounts — Venus, Jupiter, Saturn, and the Moon.',
  markings: 'Crosses, stars, and grilles are what the tradition calls the special markings.',
};

/**
 * The face (面相 / physiognomy) analogue of {@link TRADITION_CONCEPT}, keyed on the section keys the
 * server's `faceSkeletons` emits (`face_shape` / `proportion` / `eyes` / `eyebrows` / `nose` /
 * `mouth` / `ears` / `canthus`). Named classical concepts, English, no CJK, no health claims — the
 * physiognomy authenticity signal for the face reveal (audit F1.6, mvp §4.2).
 */
const FACE_TRADITION_CONCEPT: Record<string, string> = {
  face_shape: 'Face shape is physiognomy’s first reading — the five elemental faces: wood, fire, earth, metal, water.',
  proportion: 'The three courts and five eyes are the classical measure of a balanced face.',
  eyes: 'The eyes are read first in physiognomy — the feature the tradition weighs most.',
  eyebrows: 'The brows are the face’s canopy — the tradition reads their shape for temperament.',
  nose: 'The nose is the face’s mountain — its bridge and tip read for drive.',
  mouth: 'The mouth and its corners are read for warmth and expression.',
  ears: 'The ears frame the face — their set and size are an old physiognomy sign.',
  canthus: 'The under-eye — the tradition’s “silkworm” — is read for vitality and warmth.',
};

/**
 * The feature-icon each face section shows in its card (the palm path lights a mini line diagram;
 * a face reading has no line geometry, so it shows a themed icon tile). Falls back to `face`.
 *
 * All EIGHT server face keys are mapped (Audit-4 CO-5): only `face_shape` and `proportion` had
 * icons, so eyes, brows, nose, mouth, ears and canthus all collapsed onto the same `face` fallback
 * — five cards on one screen wearing the same badge. The set has no facial-feature glyphs, so these
 * are the nearest sanctioned marks (Direction §4.4 #2 names existing icons for exactly this), each
 * tied to that section's tradition line: the eyes are the feature physiognomy weighs most
 * (`sparkle`), the nose is the face's "mountain", read for drive (`compass`), the mouth reads for
 * warmth (`heart`), the under-eye reads for vitality (`life`).
 */
export const FACE_SECTION_ICON: Record<string, IconName> = {
  face_shape: 'face',
  proportion: 'elements',
  eyes: 'sparkle',
  eyebrows: 'path',
  nose: 'compass',
  mouth: 'heart',
  ears: 'globe',
  canthus: 'life',
};

/** A "what this means in the tradition" footnote citing a named classical concept (authenticity
 *  signal, audit F1.1). Kind-aware: palmistry for palm readings, physiognomy for face. Falls back
 *  to the section's grounding tag when the key is unmapped. */
export function traditionFootnote(section: ReadingSection, kind: 'palm' | 'face' = 'palm'): string {
  const named = (kind === 'face' ? FACE_TRADITION_CONCEPT : TRADITION_CONCEPT)[section.key];
  if (named) return named;
  const feature = (section.tags[0] ?? section.key).split('.')[0].replace(/_/g, ' ');
  return `In the tradition, this reads from your ${feature}.`;
}

// ── The privacy badge's label, honestly (Audit-4 SH-8 + live find 2026-07-25) ─────────────────────

export interface DeletedLabelOptions {
  /** The keep-my-scan opt-in (D2): the badge says "saved", never "deleted". */
  kept?: boolean;
  /** "Today" is relative to this instant — passed in so the function is pure and testable. */
  now?: Date;
  /** BCP-47 locale for the time/date format. Defaults to the device locale. */
  locale?: string;
}

/**
 * A timestamped "deleted" ONLY when deletion actually happened; "saved" for the keep-my-scan
 * opt-in; the 24-hour promise otherwise.
 *
 * Two fixes here (SH-8). It hand-rolled a **12-hour AM/PM clock** — `h % 12 || 12` plus a literal
 * "AM"/"PM" — which is simply wrong copy in the many locales that read a 24-hour clock, and it
 * printed a bare **time with no date**, so a reading from three weeks ago claimed its photo was
 * deleted "at 4:15 PM" as though that were this afternoon. `Intl` formats the time in the user's
 * own convention, and anything not from today carries its date.
 */
export function deletedLabel(ts?: string | null, opts: DeletedLabelOptions = {}): string {
  const { kept = false, now = new Date(), locale } = opts;
  if (kept) return CANONICAL_PHOTO_KEPT;
  if (!ts) return CANONICAL_DELETION_BADGE;
  const t = new Date(ts);
  if (Number.isNaN(t.getTime())) return 'Photo deleted';
  const sameDay =
    t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth() && t.getDate() === now.getDate();
  const parts: Intl.DateTimeFormatOptions = sameDay
    ? { hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
  return `Photo deleted · ${new Intl.DateTimeFormat(locale, parts).format(t)}`;
}

// ── The reveal route's per-reading state (Audit-4 SH-16) ──────────────────────────────────────────

/**
 * Everything the reveal route learns from ONE reading. It is a single object on purpose: the route
 * resets this state when the user opens a different reading, and when the fields lived in six
 * separate `useState`s the reset block simply *forgot* `geometry` — so reading B's pending state
 * drew reading A's palm (SH-16). Replacing one object cannot forget a field.
 */
export interface RevealLoad {
  state: RevealState;
  reading?: Reading;
  geometry: LineGeometry;
  /** The id of the reading actually loaded (not the requested one). */
  loadedId?: string;
  kind: ReadingKind;
  photoDeletedAt: string | null;
  photoKept: boolean;
}

/** The state every reveal starts from — and returns to the moment a different reading is opened. */
export function initialRevealLoad(): RevealLoad {
  return {
    state: 'pending',
    reading: undefined,
    geometry: PREVIEW_GEOMETRY,
    loadedId: undefined,
    kind: 'palm',
    photoDeletedAt: null,
    photoKept: false,
  };
}

/** The state after a reading resolves. */
export function loadedRevealLoad(res: {
  id: string;
  kind: ReadingKind;
  reading: Reading;
  geometry: LineGeometry;
  photoDeletedAt: string | null;
  photoKept: boolean;
}): RevealLoad {
  return {
    state: 'ready',
    reading: res.reading,
    geometry: res.geometry,
    loadedId: res.id,
    kind: res.kind,
    photoDeletedAt: res.photoDeletedAt,
    photoKept: res.photoKept,
  };
}

// ── A representative reading + palm for previews / device-free web-screenshot verification (P6.T3). ──
export const PREVIEW_GEOMETRY: LineGeometry = {
  heart_line: [
    [120, 300],
    [400, 270],
    [700, 285],
    [880, 305],
  ],
  head_line: [
    [130, 420],
    [450, 445],
    [770, 475],
  ],
  life_line: [
    [185, 360],
    [250, 560],
    [360, 820],
  ],
  fate_line: [
    [520, 905],
    [500, 560],
    [478, 300],
  ],
};

export const PREVIEW_READING: Reading = {
  headline: 'A Water hand — feeling runs deep in you.',
  summary: 'Sensitive, intuitive, and quietly resilient — your palm reads like still water: calm on the surface, deep beneath.',
  sections: [
    {
      key: 'hand_shape',
      title: 'Your hand — the shape of you',
      body: 'A long palm with long fingers marks the Water hand: you feel your way through the world before you reason it out, and you notice what others miss.',
      depth_level: 1,
      tags: ['hand_shape.water'],
      feature_refs: ['hand_shape.water'],
    },
    {
      key: 'heart',
      title: 'Your heart line — how you love',
      body: 'A deep, gently curving heart line reaching toward the index finger: you love wholeheartedly and choose carefully. Warmth you give slowly, you give for keeps.',
      depth_level: 1,
      tags: ['heart_line.depth.deep'],
      feature_refs: ['heart_line.depth.deep'],
    },
    {
      key: 'head',
      title: 'Your head line — how you think',
      body: 'A long head line sloping toward the Moon mount: imaginative and reflective, you think in images and stories, and trust a well-slept idea over a rushed one.',
      depth_level: 1,
      tags: ['head_line.slope.moon'],
      feature_refs: ['head_line.slope.moon'],
    },
    {
      key: 'fate',
      title: 'Your fate line — your path',
      body: '',
      depth_level: 2,
      tags: ['fate_line.origin.wrist'],
      feature_refs: ['fate_line.origin.wrist'],
    },
    {
      key: 'markings',
      title: 'Rare markings — stars, crosses & more',
      body: '',
      depth_level: 2,
      tags: ['markings.star'],
      feature_refs: ['markings.star'],
    },
  ],
  disclaimer: 'For reflection and entertainment.',
};

/**
 * A representative FACE reading for `/dev` previews + device-free screenshot verification (audit
 * F1.6). Section keys mirror the server's `faceSkeletons` (`face_shape` / `proportion` / `eyes`
 * free, `nose` / `mouth` locked) so the `/dev` layout matches a real `worker-narrative` face row.
 * English titles only — no CJK in the default UI.
 */
export const PREVIEW_FACE_READING: Reading = {
  headline: 'An Earth face — steady, and easy to trust.',
  summary: 'Broad and balanced, your face reads like settled ground: dependable, patient, and quietly warm — people lean on you without being asked.',
  sections: [
    {
      key: 'face_shape',
      title: 'Your Elemental Face',
      body: 'A full, square-set face marks the Earth type: grounded and reliable, you steady the room, and you would rather build slowly than chase fast.',
      depth_level: 1,
      tags: ['face_shape.earth'],
      feature_refs: ['face_shape.earth'],
    },
    {
      key: 'proportion',
      title: 'Balance & Proportion',
      body: 'Even three courts and a classic five-eyes width: the tradition reads this balance as a level temperament — you weigh things fairly and rarely tip to extremes.',
      depth_level: 1,
      tags: ['three_courts.even', 'five_eyes_spacing.classic'],
      feature_refs: ['three_courts.even'],
    },
    {
      key: 'eyes',
      title: 'Your Eyes',
      body: 'Calm, wide-set eyes: you take the long view and are slow to alarm, and people find your gaze reassuring rather than searching.',
      depth_level: 1,
      tags: ['eyes.shape.calm', 'eyes.set.wide'],
      feature_refs: ['eyes.set.wide'],
    },
    {
      key: 'nose',
      title: 'Your Nose',
      body: '',
      depth_level: 2,
      tags: ['nose.bridge.even'],
      feature_refs: ['nose.bridge.even'],
    },
    {
      key: 'mouth',
      title: 'Your Mouth',
      body: '',
      depth_level: 2,
      tags: ['mouth.shape.full'],
      feature_refs: ['mouth.shape.full'],
    },
  ],
  disclaimer: 'For reflection and entertainment.',
};
