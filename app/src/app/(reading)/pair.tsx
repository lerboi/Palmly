import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { PairRevealView } from '@/features/reading/PairRevealView';
import { RedThread } from '@/features/reading/ShareView';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';
import { AppHeader, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { useCompatStatus } from '@/lib/useCompatStatus';
import { loadPartnerName, toPairData } from '@/lib/compat';
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

  useEffect(() => {
    if (!pairId) return;
    let active = true;
    loadPartnerName(pairId).then((n) => active && setPartnerName(n));
    loadClaimContext().then((ctx) => active && setRole(ctx ? 'recipient' : 'sender'));
    return () => {
      active = false;
    };
  }, [pairId]);

  useEffect(() => {
    if (status === 'complete' && pairId) track('pair_reveal_viewed', { pair_id: pairId, role });
  }, [status, pairId, role]);

  if (status === 'complete' && result) {
    return (
      <PairRevealView
        data={toPairData(result, partnerName)}
        geometry={PREVIEW_GEOMETRY}
        onBack={() => router.back()}
        onFullReading={() => router.push('/reveal' as Href)}
        onShare={() => router.push('/share?initialVariant=compat' as Href)}
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
