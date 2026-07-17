import type { LineGeometry } from '@/components/palm-diagram/geometry';

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

/** The palm line a narrative section highlights in cinnabar (undefined → show the whole diagram). */
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

/** A "what this means in the tradition" footnote from a section's grounding tags (authenticity signal). */
export function traditionFootnote(section: ReadingSection): string {
  const key = section.tags[0] ?? section.key;
  const feature = key.split('.')[0].replace(/_/g, ' ');
  return `In the tradition, this reads from your ${feature}.`;
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
