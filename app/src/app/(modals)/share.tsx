import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShareView, type ShareSource } from '@/features/reading/ShareView';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { loadReading } from '@/lib/readings';

/**
 * Share sheet (UIUX §2.6/§2.7, audit F0.4). Takes `readingId` + `initialVariant` (+ `source`) params
 * from the reveal seal / compare card and the pair "Share this match" button, loads the real
 * reading's headline + traced geometry for the preview, and threads `readingId` into the minted
 * invite's context. The solo card preview is real; the **compat** preview's score/partner are still
 * placeholder until real pair data (F0.T9) + the compat card class (F1.T9) land. The OS share sheet
 * is device-only ([~]).
 */
export default function Share() {
  const router = useRouter();
  const { readingId, initialVariant, source } = useLocalSearchParams<{
    readingId?: string;
    initialVariant?: string;
    source?: string;
  }>();
  const [loaded, setLoaded] = useState<{ headline: string; geometry: LineGeometry } | null>(null);

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

  const variant = initialVariant === 'compat' ? 'compat' : 'solo';
  const shareSource: ShareSource =
    variant === 'compat' ? 'compat' : source === 'home' || source === 'face' ? source : 'reveal';

  return (
    <ShareView
      readingId={readingId}
      geometry={loaded?.geometry ?? PREVIEW_GEOMETRY}
      headline={loaded?.headline ?? 'My palm reading'}
      score={82}
      partnerName="Mei"
      initialVariant={variant}
      source={shareSource}
      onClose={() => router.back()}
    />
  );
}
