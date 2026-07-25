import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { PairNotice, PairRevealView, PairWaiting } from '@/features/reading/PairRevealView';
import { ABSTRACT_GEOMETRY } from '@/features/reading/reveal';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { Screen } from '@/components/ui';
import { useCompatStatus } from '@/lib/useCompatStatus';
import { loadPartnerName, requestCompat, toPairData } from '@/lib/compat';
import { loadClaimContext } from '@/lib/claim';
import { loadHistory, loadReading } from '@/lib/readings';
import { track } from '@/lib/analytics';

/**
 * Compatibility pair-reveal (UIUX §2.7.4 / §2.10, audit F0.6). Loads the real `compatibility_results`
 * for its `pairId` via {@link useCompatStatus} (RLS read + `compat:{pairId}` Realtime broadcast +
 * ~10s re-poll fallback) so the two-sided reveal choreography starts when the status flips
 * `complete`. While the other side is still computing it shows a calm waiting state that escalates
 * to a nudge (SH-15); a failure stays Palmly.
 *
 * **The 402 gate is checked BEFORE anything renders** (SH-15): the free-comparison gate used to run
 * after the screen was already up, so a gated user saw the waiting state — or the whole reveal —
 * and was then yanked to the paywall. The caller's own palm is their real stored geometry when they
 * have one; the partner's is derived (no partner geometry exists client-side).
 */
export default function Pair() {
  const router = useRouter();
  const { pairId } = useLocalSearchParams<{ pairId?: string }>();
  const { status, result, error } = useCompatStatus(pairId ?? null);
  const [partnerName, setPartnerName] = useState('Your match');
  const [role, setRole] = useState<'sender' | 'recipient'>('sender');
  // SN-6: "See my full reading" pushed `/reveal` with NO id, so `loadReading({})` returned null and
  // the primary CTA at the emotional peak landed on the error state. The compat row carries no
  // reading id, so resolve the caller's own newest reading (RLS-scoped) and thread it. Null while
  // it resolves, or when they have none — the CTA simply isn't offered then.
  const [ownReadingId, setOwnReadingId] = useState<string | null>(null);
  // SH-7: both palms were fixtures. The caller's own is a real stored geometry when they have one.
  const [ownGeometry, setOwnGeometry] = useState<LineGeometry | null>(null);
  // The waiting state escalates on a mount timer (SH-15) — calm → slow → nudge.
  const [waitedMs, setWaitedMs] = useState(0);

  useEffect(() => {
    if (!pairId) return;
    let active = true;
    loadPartnerName(pairId).then((n) => active && setPartnerName(n));
    loadClaimContext().then((ctx) => active && setRole(ctx ? 'recipient' : 'sender'));
    loadHistory()
      .then((rows) => {
        if (!active) return null;
        setOwnReadingId(rows[0]?.id ?? null);
        return rows[0] ? loadReading({ readingId: rows[0].id }) : null;
      })
      .then((res) => {
        if (active && res) setOwnGeometry(res.geometry);
      })
      .catch(() => {
        /* no stored reading → the decorative geometry, same as before */
      });
    return () => {
      active = false;
    };
  }, [pairId]);

  useEffect(() => {
    const step = 1000;
    const timer = setInterval(() => setWaitedMs((ms) => ms + step), step);
    return () => clearInterval(timer);
  }, []);

  // The free-comparison gate (Backend §4, §4.6): request the comparison; the SERVER returns 402 for a
  // non-premium caller's second comparison, which we treat as the signal to route to the paywall. A
  // complete/computing result is returned idempotently BEFORE the gate, so re-opening never paywalls.
  const gateRef = useRef(false);
  const [gatePassed, setGatePassed] = useState(false);
  useEffect(() => {
    if (!pairId || gateRef.current) return;
    gateRef.current = true;
    void requestCompat(pairId).then((r) => {
      if (!r.ok && r.gated) {
        router.replace('/paywall?trigger=compat_second' as Href);
        return; // stay unrendered — the paywall is the destination, not a flash of this screen
      }
      setGatePassed(true);
    });
  }, [pairId, router]);
  // Derived, not set in an effect body: with no pairId there is no gate to wait for.
  const gateChecked = !pairId || gatePassed;

  useEffect(() => {
    if (status === 'complete' && pairId) track('pair_reveal_viewed', { pair_id: pairId, role });
  }, [status, pairId, role]);

  // The auto-presented share modal is GONE (CO-16). It fired 2s after `complete` — on top of the
  // still-running choreography — and took over the screen at the exact moment the user was reading
  // their score. The in-page "Share this match" CTA offers the same thing without the ambush.

  // Nothing renders until the gate answers — a gated user goes straight to the paywall (SH-15).
  if (!gateChecked) return <Screen><View /></Screen>;

  if (status === 'complete' && result) {
    return (
      <PairRevealView
        data={toPairData(result, partnerName)}
        geometry={ownGeometry ?? ABSTRACT_GEOMETRY}
        pairId={pairId}
        onBack={() => router.back()}
        onDone={() => router.replace('/fortune')}
        onFullReading={ownReadingId ? () => router.push(`/reveal?readingId=${ownReadingId}` as Href) : undefined}
        onShare={() => router.push(`/share?initialVariant=compat&source=compat&pairId=${pairId}` as Href)}
      />
    );
  }

  if (status === 'failed' || error) {
    return (
      <PairNotice
        title="We couldn’t complete this match"
        body="Your reading is safe — this was a hiccup on our side. Try again in a moment."
        onBack={() => router.back()}
      />
    );
  }

  return (
    <PairWaiting
      partnerName={partnerName}
      elapsedMs={waitedMs}
      onBack={() => router.back()}
      onNudge={pairId ? () => router.push(`/share?initialVariant=compat&source=compat&pairId=${pairId}` as Href) : undefined}
    />
  );
}

