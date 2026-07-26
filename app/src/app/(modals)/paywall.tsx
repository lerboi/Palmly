import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { PaywallView, type Plan } from '@/features/paywall/PaywallView';
import { ABSTRACT_GEOMETRY } from '@/features/reading/reveal';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { loadHistory, loadReading } from '@/lib/readings';
import { restorePurchases } from '@/lib/revenuecat';
import { setPaywallDeclined } from '@/lib/session';
import { track, type AnalyticsEventMap } from '@/lib/analytics';

/**
 * Paywall (UIUX §2.8, audit F1.2). Renders {@link PaywallView} with launch plan fixtures (no-trial,
 * direct purchase — U3) + the user's palm as the personalized hero. The `trigger`/`section` params
 * (F0.T12 + F1.T1) drive the hero so it MATCHES the tapped tease — two different lock taps produce
 * two different heroes. On dismiss it records `declined_at` (the win-back trigger) + fires
 * `paywall_dismissed`; "Restore" is honest (never the sales screen), Terms · Privacy link to /legal.
 * The real RevenueCat offerings + purchase/restore round-trip are device + H8 (`[~]`).
 */
/**
 * **PLACEHOLDER OFFERS — no prices, on purpose (Audit-4 SH-7, Direction §4.10).**
 *
 * These used to read "$35.88 billed yearly", "$2.99 / mo", "SAVE 40%" and "$4.99 / mo" — numbers
 * nobody had set, on a screen whose CTA merely closed the modal. A user could read a price, tap
 * buy, and get nothing. Real prices come from RevenueCat offerings (R1.T4/R4, out of scope for this
 * ledger), so until then the cards carry SHAPE and no numbers, and the CTA says so.
 */
const PLACEHOLDER_OFFERS: Plan[] = [
  { id: 'annual', name: 'Annual', price: 'Billed once a year', perMonth: 'Best value' },
  { id: 'monthly', name: 'Monthly', price: 'Billed monthly', perMonth: 'Flexible' },
];

type PaywallTrigger = AnalyticsEventMap['paywall_viewed']['trigger'];
const TRIGGERS: PaywallTrigger[] = [
  'locked_section',
  'fortune_full',
  'compat_second',
  'chat_entry',
  'post_share',
  'settings',
  // Audit-5 (01 §7): the daily workhorse, the chapter-turn spike, and the milestone soft variant.
  'pulse_full',
  'cycle_boundary',
  'streak_milestone',
];

/**
 * Section/feature key → the palm line to light + a human name for the tease (audit F1.2 — hero
 * matches what the reader tapped).
 *
 * Audit-5 extends this from the 7 palm sections to all 15 pulse features, because `pulse_full`
 * passes today's feature as `section`: a reader who just met their BROWS must not be sold on a
 * "fate line". Face features light no line — the hero shows their palm unlit and the copy names the
 * face feature, which is honest about what the diagram is.
 */
const SECTION_TEASE: Record<string, { line?: string; name: string }> = {
  heart: { line: 'heart_line', name: 'heart line' },
  head: { line: 'head_line', name: 'head line' },
  life: { line: 'life_line', name: 'life line' },
  fate: { line: 'fate_line', name: 'fate line' },
  hand_shape: { name: 'hand-shape reading' },
  mounts: { name: 'mounts' },
  markings: { name: 'rare markings' },
  face_shape: { name: 'elemental face' },
  proportion: { name: 'proportions' },
  eyes: { name: 'eyes' },
  eyebrows: { name: 'brows' },
  nose: { name: 'nose' },
  mouth: { name: 'mouth' },
  ears: { name: 'ears' },
  canthus: { name: 'under-eye' },
};

interface Hero {
  lockedLine?: string;
  lockedNames: string[];
  heroTitle?: string;
  heroSubtitle?: string;
}

/** Build the hero copy from the trigger + tapped section, so the pitch matches what the user tapped. */
function heroFor(trigger: PaywallTrigger, section?: string): Hero {
  if (trigger === 'locked_section' && section && SECTION_TEASE[section]) {
    const t = SECTION_TEASE[section];
    return {
      lockedLine: t.line,
      lockedNames: [t.name],
      heroTitle: 'Your palm has more to say',
      heroSubtitle: `Your ${t.name} is still hidden — unlock the full read.`,
    };
  }
  // Today's Line: the hero lights TODAY's feature, so the paywall is visibly about the reading the
  // user just had rather than a generic upsell. The hero system already accepts a highlighted line;
  // this just hands it the right one.
  if ((trigger === 'pulse_full' || trigger === 'cycle_boundary') && section && SECTION_TEASE[section]) {
    const t = SECTION_TEASE[section];
    return trigger === 'pulse_full'
      ? {
          lockedLine: t.line,
          lockedNames: [`daily ${t.name} reading`],
          heroTitle: 'The rest of today’s reading',
          heroSubtitle: `Your ${t.name}, read in full — every day, not just today.`,
        }
      : {
          lockedLine: t.line,
          lockedNames: [`${t.name} chapters`],
          heroTitle: `A new chapter of your ${t.name}`,
          heroSubtitle: 'Read the chapter that just opened — and see what comes next.',
        };
  }
  switch (trigger) {
    case 'fortune_full':
      return { lockedLine: 'fate_line', lockedNames: ['daily almanac'], heroTitle: 'Your daily almanac awaits', heroSubtitle: 'Unlock today’s full fortune — lucky hours, directions, and the year ahead.' };
    case 'chat_entry':
      return { lockedLine: 'head_line', lockedNames: ['reading chat'], heroTitle: 'Ask your palm anything', heroSubtitle: 'Chat about your reading — go as deep as you want.' };
    case 'compat_second':
      return { lockedLine: 'heart_line', lockedNames: ['compatibility matches'], heroTitle: 'Compare with everyone', heroSubtitle: 'Unlock unlimited compatibility matches with your friends.' };
    case 'post_share':
      return { lockedLine: 'fate_line', lockedNames: ['full reading'], heroTitle: 'You’ve got more to reveal', heroSubtitle: 'Unlock your full reading, daily fortune, and unlimited matches.' };
    // Reached without a feature (a boundary tapped before the day's line resolved), and from the
    // milestone sheet. The milestone variant is deliberately the softest copy on the screen: the
    // reader has just been congratulated, and a hard pitch there would sour the moment (01 §7 T3).
    case 'pulse_full':
      return { lockedLine: 'heart_line', lockedNames: ['daily reading'], heroTitle: 'The rest of today’s reading', heroSubtitle: 'Your own lines, read in full — every day.' };
    case 'cycle_boundary':
      return { lockedLine: 'fate_line', lockedNames: ['line chapters'], heroTitle: 'A new chapter just opened', heroSubtitle: 'Read the chapter your line has entered — and see what comes next.' };
    case 'streak_milestone':
      return { lockedLine: 'life_line', lockedNames: ['daily readings'], heroTitle: 'Keep the days going', heroSubtitle: 'Your full daily readings, for as long as the streak lasts.' };
    default:
      return { lockedLine: 'fate_line', lockedNames: ['deep-dive lines'] };
  }
}

export default function Paywall() {
  const router = useRouter();
  const params = useLocalSearchParams<{ trigger?: string; section?: string }>();
  const trigger: PaywallTrigger = (TRIGGERS as string[]).includes(params.trigger ?? '')
    ? (params.trigger as PaywallTrigger)
    : 'locked_section';
  const section = typeof params.section === 'string' ? params.section : undefined;
  const hero = heroFor(trigger, section);

  useEffect(() => {
    track('paywall_viewed', { trigger });
    // The paywall is a single page (page 0), consistent with `paywall_dismissed`'s page — this
    // completes the funnel view→page→dismiss (A7). A multi-page pager would emit one per page.
    track('paywall_page_viewed', { trigger, page: 0 });
  }, [trigger]);

  const onClose = () => {
    track('paywall_dismissed', { trigger, page: 0 });
    void setPaywallDeclined(new Date().toISOString()); // the server winback template's trigger
    router.back();
  };

  // SH-7: the hero drew ABSTRACT_GEOMETRY under copy reading "your fate line" — a fixture presented
  // as the reader's own hand. Their newest stored reading is the honest source; without one the
  // palm is an illustration and the copy drops the possessive.
  const [ownGeometry, setOwnGeometry] = useState<LineGeometry | null>(null);
  useEffect(() => {
    let active = true;
    loadHistory()
      .then((rows) => (rows[0] ? loadReading({ readingId: rows[0].id }) : null))
      .then((res) => {
        if (active && res) setOwnGeometry(res.geometry);
      })
      .catch(() => {
        /* no stored reading → the abstract hero, which is the honest default */
      });
    return () => {
      active = false;
    };
  }, []);

  const onRestore = () => {
    void restorePurchases().then((r) => Alert.alert('Restore purchases', r.message));
  };

  return (
    <PaywallView
      plans={PLACEHOLDER_OFFERS}
      defaultPlanId="annual"
      geometry={ownGeometry ?? ABSTRACT_GEOMETRY}
      ownGeometry={ownGeometry != null}
      offersPending
      lockedLine={hero.lockedLine}
      lockedNames={hero.lockedNames}
      heroTitle={hero.heroTitle}
      heroSubtitle={hero.heroSubtitle}
      onClose={onClose}
      onPurchase={() => router.back()}
      onRestore={onRestore}
      onLegal={(s) => router.push(`/legal?section=${s}` as Href)}
    />
  );
}
