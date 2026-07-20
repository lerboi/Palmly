import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { PairRevealView } from '@/features/reading/PairRevealView';
import { RedThread } from '@/features/reading/ShareView';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';
import { AppHeader, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { useCompatStatus } from '@/lib/useCompatStatus';
import { loadPartnerName, markCompatPromptSeen, requestCompat, toPairData, wasCompatPromptSeen } from '@/lib/compat';
import { AUTO_PRESENT_DELAY_MS, shouldAutoPresent } from '@/lib/compatCopy';
import { loadClaimContext } from '@/lib/claim';
import { track } from '@/lib/analytics';

/**
 * Compatibility pair-reveal (UIUX §2.7.4 / §2.10, audit F0.6). Loads the real `compatibility_results`
 * for its `pairId` via {@link useCompatStatus} (RLS read + `compat:{pairId}` Realtime broadcast +
 * ~10s re-poll fallback) so the two-sided reveal choreography starts when the status flips
 * `complete`. While the other side is still computing it shows a calm waiting state; a failure stays
 * Palmly. The traced-palm geometry is PREVIEW_GEOMETRY for now (per-member geometry is craft, F1.T9).
 */
export default function Pair() {
  const router = useRouter();
  const { pairId } = useLocalSearchParams<{ pairId?: string }>();
  const { status, result, error } = useCompatStatus(pairId ?? null);
  const [partnerName, setPartnerName] = useState('Your match');
  const [role, setRole] = useState<'sender' | 'recipient'>('sender');
  const [promptSeen, setPromptSeen] = useState(true); // default true → never auto-present until known

  useEffect(() => {
    if (!pairId) return;
    let active = true;
    loadPartnerName(pairId).then((n) => active && setPartnerName(n));
    loadClaimContext().then((ctx) => active && setRole(ctx ? 'recipient' : 'sender'));
    wasCompatPromptSeen(pairId).then((seen) => active && setPromptSeen(seen));
    return () => {
      active = false;
    };
  }, [pairId]);

  // The free-comparison gate (Backend §4, §4.6): request the comparison; the SERVER returns 402 for a
  // non-premium caller's second comparison, which we treat as the signal to route to the paywall. A
  // complete/computing result is returned idempotently BEFORE the gate, so re-opening never paywalls.
  const gateRef = useRef(false);
  useEffect(() => {
    if (!pairId || gateRef.current) return;
    gateRef.current = true;
    void requestCompat(pairId).then((r) => {
      if (!r.ok && r.gated) router.replace('/paywall?trigger=compat_second' as Href);
    });
  }, [pairId, router]);

  useEffect(() => {
    if (status === 'complete' && pairId) track('pair_reveal_viewed', { pair_id: pairId, role });
  }, [status, pairId, role]);

  // Auto-present the compat share sheet ~2s after the score lands (UIUX §2.7.4 — both sides get the
  // "text each other" moment). One dismissal disables it per pair (persisted); reduce-motion is
  // respected by the native modal transition. Fires at most once.
  const presentedRef = useRef(false);
  useEffect(() => {
    if (!pairId || presentedRef.current || !shouldAutoPresent(status, promptSeen)) return;
    presentedRef.current = true;
    const id = setTimeout(() => {
      void markCompatPromptSeen(pairId);
      router.push(`/share?initialVariant=compat&source=compat&pairId=${pairId}` as Href);
    }, AUTO_PRESENT_DELAY_MS);
    return () => clearTimeout(id);
  }, [status, promptSeen, pairId, router]);

  if (status === 'complete' && result) {
    return (
      <PairRevealView
        data={toPairData(result, partnerName)}
        geometry={PREVIEW_GEOMETRY}
        onBack={() => router.back()}
        onFullReading={() => router.push('/reveal' as Href)}
        onShare={() => router.push(`/share?initialVariant=compat&source=compat&pairId=${pairId}` as Href)}
      />
    );
  }

  if (status === 'failed' || error) {
    return (
      <PairNotice
        title="We couldn&apos;t complete this match"
        body="Your reading is safe — this was a hiccup on our side. Try again in a moment."
        onBack={() => router.back()}
      />
    );
  }

  return <PairWaiting partnerName={partnerName} onBack={() => router.back()} />;
}

/** Calm waiting state — the red thread is tied; the score is still being woven. */
function PairWaiting({ partnerName, onBack }: { partnerName: string; onBack: () => void }) {
  const theme = useTheme();
  return (
    <Screen>
      <AppHeader onBack={onBack} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg }}>
        <RedThread animate />
        <Text variant="title" style={{ textAlign: 'center' }}>
          Weaving your red thread…
        </Text>
        <Text variant="bodyLarge" tone="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
          Reading how your lines meet {partnerName === 'Your match' ? 'your match' : partnerName}&apos;s. This lands the moment both palms are in.
        </Text>
      </View>
    </Screen>
  );
}

/** Honest failure — a warm dead-end, exit via the header. */
function PairNotice({ title, body, onBack }: { title: string; body: string; onBack: () => void }) {
  const theme = useTheme();
  return (
    <Screen>
      <AppHeader onBack={onBack} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md }}>
        <Text variant="title" style={{ textAlign: 'center' }}>
          {title}
        </Text>
        <Text variant="bodyLarge" tone="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
          {body}
        </Text>
      </View>
    </Screen>
  );
}
