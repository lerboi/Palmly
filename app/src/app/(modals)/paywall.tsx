import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { PaywallView, type Plan } from '@/features/paywall/PaywallView';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';
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
const PLANS: Plan[] = [
  { id: 'annual', name: 'Annual', price: '$35.88 billed yearly', perMonth: '$2.99 / mo', badge: 'SAVE 40%' },
  { id: 'monthly', name: 'Monthly', price: 'billed monthly', perMonth: '$4.99 / mo' },
];

type PaywallTrigger = AnalyticsEventMap['paywall_viewed']['trigger'];
const TRIGGERS: PaywallTrigger[] = ['locked_section', 'fortune_full', 'compat_second', 'chat_entry', 'post_share', 'settings'];

/** Section key → the palm line to light + a human name for the tease (audit F1.2 — hero matches). */
const SECTION_TEASE: Record<string, { line?: string; name: string }> = {
  heart: { line: 'heart_line', name: 'heart line' },
  head: { line: 'head_line', name: 'head line' },
  life: { line: 'life_line', name: 'life line' },
  fate: { line: 'fate_line', name: 'fate line' },
  hand_shape: { name: 'hand-shape reading' },
  mounts: { name: 'mounts' },
  markings: { name: 'rare markings' },
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
  switch (trigger) {
    case 'fortune_full':
      return { lockedLine: 'fate_line', lockedNames: ['daily almanac'], heroTitle: 'Your daily almanac awaits', heroSubtitle: 'Unlock today’s full fortune — lucky hours, directions, and the year ahead.' };
    case 'chat_entry':
      return { lockedLine: 'head_line', lockedNames: ['reading chat'], heroTitle: 'Ask your palm anything', heroSubtitle: 'Chat about your reading — go as deep as you want.' };
    case 'compat_second':
      return { lockedLine: 'heart_line', lockedNames: ['compatibility matches'], heroTitle: 'Compare with everyone', heroSubtitle: 'Unlock unlimited compatibility matches with your friends.' };
    case 'post_share':
      return { lockedLine: 'fate_line', lockedNames: ['full reading'], heroTitle: 'You’ve got more to reveal', heroSubtitle: 'Unlock your full reading, daily fortune, and unlimited matches.' };
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
  }, [trigger]);

  const onClose = () => {
    track('paywall_dismissed', { trigger, page: 0 });
    void setPaywallDeclined(new Date().toISOString()); // the server winback template's trigger
    router.back();
  };

  const onRestore = () => {
    void restorePurchases().then((r) => Alert.alert('Restore purchases', r.message));
  };

  return (
    <PaywallView
      plans={PLANS}
      defaultPlanId="annual"
      geometry={PREVIEW_GEOMETRY}
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
