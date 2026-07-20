import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShareView, type ShareSource } from '@/features/reading/ShareView';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { loadReading } from '@/lib/readings';
import { loadCompatShare } from '@/lib/compat';
import { loadPendingCompat } from '@/lib/pendingCompat';

/**
 * Share sheet (UIUX §2.6/§2.7, audit F0.4 / A6). Takes `readingId` + `initialVariant` (+ `source`,
 * `pairId`) params from the reveal seal / compare card and the pair "Share this match" button, loads
 * the real reading's headline + traced geometry for the preview, and threads `readingId` into the
 * minted invite's context. The **compat** preview now shows the REAL pair's score + partner name
 * (loaded from `pairId`), not the old hardcoded `82` / `"Mei"` — real users were being prompted to
 * send a card bearing a fake name/score. The OS share sheet is device-only ([~]).
 */
export default function Share() {
  const router = useRouter();
  const { readingId, initialVariant, source, reshare, pairId } = useLocalSearchParams<{
    readingId?: string;
    initialVariant?: string;
    source?: string;
    reshare?: string;
    pairId?: string;
  }>();
  const [loaded, setLoaded] = useState<{ headline: string; geometry: LineGeometry } | null>(null);
  // Real compat pair result (score + partner name) for the compat card — null until loaded (A6).
  const [compat, setCompat] = useState<{ score: number; partnerName: string } | null>(null);
  // Home red-thread nudge (`?reshare=1`): reopen on the SAME sent link (no second invite minted).
  const [presetUrl, setPresetUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!readingId) return;
    let active = true;
    loadReading({ readingId }).then((r) => {
      if (active && r) setLoaded({ headline: r.reading.headline, geometry: r.geometry });
    });
    return () => {
      active = false;
    };
  }, [readingId]);

  useEffect(() => {
    if (reshare !== '1') return;
    let active = true;
    loadPendingCompat().then((p) => {
      if (active && p) setPresetUrl(p.url);
    });
    return () => {
      active = false;
    };
  }, [reshare]);

  // The compat card's score + partner name come from the REAL pair (A6). Only loaded for the compat
  // variant with a pairId; the sheet only auto-opens after the score has landed, so this resolves.
  useEffect(() => {
    if (initialVariant !== 'compat' || !pairId) return;
    let active = true;
    loadCompatShare(pairId).then((c) => {
      if (active && c) setCompat(c);
    });
    return () => {
      active = false;
    };
  }, [initialVariant, pairId]);

  const variant = initialVariant === 'compat' ? 'compat' : 'solo';
  const shareSource: ShareSource =
    variant === 'compat' ? 'compat' : source === 'home' || source === 'face' ? source : 'reveal';

  return (
    <ShareView
      readingId={readingId}
      geometry={loaded?.geometry ?? PREVIEW_GEOMETRY}
      headline={loaded?.headline ?? 'My palm reading'}
      score={compat?.score ?? 0}
      partnerName={compat?.partnerName ?? 'Your match'}
      initialVariant={variant}
      source={shareSource}
      presetInviteUrl={presetUrl}
      onClose={() => router.back()}
    />
  );
}
