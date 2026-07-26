// Notification content (Backend §10, UIUX §4). Server-rendered, per-locale push copy in the
// "considered scholar-friend" voice — observational, a little poetic, never demanding. Every push
// deep-links to its exact context. This module is PURE: (type, context, locale) → a fully-rendered
// {title, body, deep_link} plus the two routing facts the enqueue layer needs — a `dedupe_key`
// (so a repeat trigger of the same entity collapses to one push) and a `cap_class`
// ('marketing' counts against the hard 1/day cap; 'exempt' = social + pipeline, §10).
//
// Localization: EN ships first (UIUX §7 — EN first). Adding a locale = adding a catalog entry;
// the rendering/escaping is locale-agnostic. Interpolated context values are sanitized (control
// chars + newlines stripped) so a hostile display_name can't inject a second line into a push.

export type NotifType =
  | 'reading_ready'
  | 'compat_complete'
  | 'invite_accepted'
  | 'daily_fortune'
  | 'daily_pulse'
  | 'solar_term'
  | 'winback'
  | 'invite_nudge'
  | 'onboarding_d1'
  | 'onboarding_d2'
  | 'onboarding_d3';

export type CapClass = 'marketing' | 'exempt';

export interface NotifContext {
  name?: string; // other member / friend display name
  score?: number; // compat composite
  scan_id?: string;
  reading_id?: string;
  pair_id?: string;
  feature_label?: string; // Today's Line — the reader's own feature, e.g. 'heart line'
  weekday?: string; // e.g. 'Friday' — the day the line is about
  is_boundary?: boolean; // the reader's chapter turns today → the boundary copy variant
  fortune_date?: string; // lunar-day label, e.g. '初七'
  fortune_hook?: string; // e.g. 'A day that favors beginnings'
  lucky_direction?: string; // e.g. 'East'
  solar_term?: string; // e.g. '立秋'
  solar_hook?: string; // e.g. 'the almanac counsels patience in money matters'
  offer?: string; // win-back, e.g. '40% off your first year'
  focus_line?: string; // onboarding, e.g. '婚姻线'
  invite_id?: string; // invite_nudge — the pending invite to nudge
  elapsed?: string; // invite_nudge — human elapsed label, e.g. '2 days ago'
}

export interface RenderedNotif {
  type: NotifType;
  title: string;
  body: string;
  deep_link: string;
  dedupe_key: string;
  cap_class: CapClass;
}

// Which pushes count against the hard "1 marketing-ish push/day" cap (§10). Fortune, solar-term,
// onboarding and win-back are the content/marketing sends; reading-ready + compat + invite are
// event-driven (exempt from the cap, but still deduped).
const CAP_CLASS: Record<NotifType, CapClass> = {
  reading_ready: 'exempt',
  compat_complete: 'exempt',
  invite_accepted: 'exempt',
  daily_fortune: 'marketing',
  // The morning Today's Line push. Marketing class, so the hard 1/day cap and quiet hours apply —
  // the loop gets ONE morning send, and it competes for the same slot as the almanac push rather
  // than stacking on top of it (01 §9: push fatigue is designed against, not hoped away).
  daily_pulse: 'marketing',
  solar_term: 'marketing',
  winback: 'marketing',
  invite_nudge: 'marketing', // proactive 48h cron re-share reminder → counts against the 1/day cap
  onboarding_d1: 'marketing',
  onboarding_d2: 'marketing',
  onboarding_d3: 'marketing',
};

/** Strip control chars / newlines and collapse whitespace — an interpolated value must not break
 *  out of its line (push-copy injection) or introduce a fake second notification line. Done with an
 *  explicit code-point scan rather than a control-class regex (keeps the source byte-clean). */
function clean(v: unknown, fallback = ''): string {
  if (v === undefined || v === null) return fallback;
  let out = '';
  for (const ch of String(v)) {
    const code = ch.codePointAt(0) ?? 0;
    out += code < 0x20 || code === 0x7f ? ' ' : ch;
  }
  const s = out.replace(/\s+/g, ' ').trim();
  return s.length ? s : fallback;
}

const num = (v: unknown): string => (typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v)) : '');

/** Capitalize the first letter (leaves CJK/emoji untouched). */
function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

// One entry per type per locale → {title, body, deep_link, dedupe_key}. dedupe_key is entity-scoped
// so distinct entities (two different scans) each notify, but a re-fire of the SAME entity within
// the day collapses (the notification_log is keyed on user + key + day).
type Rendered = { title: string; body: string; deep_link: string; dedupe_key: string };
type Catalog = Record<NotifType, (c: NotifContext) => Rendered>;

function onboarding(day: 1 | 2 | 3, c: NotifContext): Rendered {
  const focus = clean(c.focus_line);
  return { title: `Day ${day} with Palmly`, body: focus ? `Your ${focus} analysis is waiting.` : 'A new layer of your reading is waiting.', deep_link: 'palmly://fortune', dedupe_key: `onboarding_d${day}` };
}

const EN: Catalog = {
  reading_ready: (c) => {
    const id = clean(c.reading_id ?? c.scan_id);
    return { title: 'Your lines have been read 🖋', body: 'Come see what they say.', deep_link: id ? `palmly://reading/${id}` : 'palmly://fortune', dedupe_key: `reading_ready:${id || 'latest'}` };
  },
  compat_complete: (c) => {
    const who = clean(c.name, 'your match');
    const score = num(c.score);
    const pair = clean(c.pair_id);
    return { title: 'The thread is tied 🧧', body: score ? `You and ${who} scored ${score}.` : `Your reading with ${who} is ready.`, deep_link: pair ? `palmly://compat/${pair}` : 'palmly://fortune', dedupe_key: `compat_complete:${pair || who}` };
  },
  invite_accepted: (c) => {
    const who = clean(c.name, 'Your friend');
    const pair = clean(c.pair_id);
    return { title: `${who} just scanned their palm`, body: 'Your result is minutes away.', deep_link: pair ? `palmly://compat/${pair}` : 'palmly://fortune', dedupe_key: `invite_accepted:${pair || who}` };
  },
  daily_fortune: (c) => {
    const day = clean(c.fortune_date);
    const hook = clean(c.fortune_hook, 'Today’s almanac is ready');
    const dir = clean(c.lucky_direction);
    return { title: day ? `${day} · ${hook}` : hook, body: dir ? `Your lucky direction: ${dir}.` : 'Open to read the day.', deep_link: 'palmly://fortune', dedupe_key: 'daily_fortune' };
  },
  daily_pulse: (c) => {
    // The push NAMES the reader's own feature — that is the entire difference from a horoscope
    // notification, and the reason contextual pushes out-open generic ones ~3.4× (01 §2.1).
    // The fallback is deliberately still specific ("your palm") rather than "your reading":
    // a nameless push would be the generic one we are trying not to send.
    const feature = clean(c.feature_label, 'palm');
    const weekday = clean(c.weekday);
    if (c.is_boundary === true) {
      return {
        title: `Your ${feature} turns a page today`,
        body: 'A new chapter opens — see what it says.',
        deep_link: 'palmly://fortune',
        dedupe_key: 'daily_pulse',
      };
    }
    return {
      title: `Your ${feature} has something to say`,
      body: weekday ? `Open Palmly to read ${weekday}.` : 'Open Palmly to read today.',
      deep_link: 'palmly://fortune',
      // Keyed on the type alone, NOT on the feature: two sends on one day are the same push
      // regardless of which line they name, and keying on the feature would let a second one
      // through (the dedupe index is (user, key, day)).
      dedupe_key: 'daily_pulse',
    };
  },
  solar_term: (c) => {
    const term = clean(c.solar_term, 'A new solar term');
    const hook = clean(c.solar_hook, 'the almanac turns a page today');
    return { title: `${term} begins today`, body: `${cap(hook)}.`, deep_link: 'palmly://fortune', dedupe_key: `solar_term:${term}` };
  },
  winback: (c) => {
    const offer = clean(c.offer, 'a welcome gift on your first year');
    return { title: 'A gift while your reading is fresh', body: `${cap(offer)}.`, deep_link: 'palmly://paywall?offer=winback', dedupe_key: 'winback' };
  },
  invite_nudge: (c) => {
    // A gentle 48h re-share reminder for a still-pending compat invite. Lands on home, where the
    // red-thread pending card reopens the sheet with the SAME link (no palmly://invite route exists).
    const who = clean(c.name, 'your match');
    const when = clean(c.elapsed);
    return { title: 'Your red thread is still loose 🧧', body: when ? `You invited ${who} ${when} — a nudge might tie it.` : `You invited ${who} — a nudge might tie it.`, deep_link: 'palmly://fortune', dedupe_key: `invite_nudge:${clean(c.invite_id) || who}` };
  },
  onboarding_d1: (c) => onboarding(1, c),
  onboarding_d2: (c) => onboarding(2, c),
  onboarding_d3: (c) => onboarding(3, c),
};

const CATALOGS: Record<string, Catalog> = { en: EN };

/** Render a notification's copy + routing facts. Falls back to the EN catalog for unknown locales. */
export function renderNotification(type: NotifType, context: NotifContext = {}, locale = 'en'): RenderedNotif {
  const catalog = CATALOGS[locale] ?? EN;
  const build = catalog[type];
  if (!build) throw new Error(`unknown notification type: ${type}`);
  const { title, body, deep_link, dedupe_key } = build(context);
  return { type, title, body, deep_link, dedupe_key, cap_class: CAP_CLASS[type] };
}

export const notifCapClass = (type: NotifType): CapClass => CAP_CLASS[type];
export const supportedLocales = (): string[] => Object.keys(CATALOGS);
