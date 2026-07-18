import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { RevealView, type RevealState } from '@/features/reading/RevealView';
import { PREVIEW_GEOMETRY, type Reading } from '@/features/reading/reveal';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { loadReading } from '@/lib/readings';
import { track } from '@/lib/analytics';

/**
 * Reading reveal (UIUX §2.5, audit F0.3). Loads the real `readings` row via supabase-js (RLS) —
 * keyed on `readingId` (from history) or `scanId` (from the analyzing hand-off) — and renders it
 * through {@link RevealView}'s built-in pending / error / ready states. No fixtures: an unreadable
 * or missing reading falls to the honest error state, not fake content. The traced-palm geometry
 * comes from the reading's own `feature_sets.features.line_geometry`; PREVIEW_GEOMETRY is only the
 * decorative shape shown while loading/failed.
 */
export default function Reveal() {
  const { readingId, scanId } = useLocalSearchParams<{ readingId?: string; scanId?: string }>();
  const [reloads, setReloads] = useState(0);
  const key = `${readingId ?? ''}|${scanId ?? ''}|${reloads}`;

  const [state, setState] = useState<RevealState>('pending');
  const [reading, setReading] = useState<Reading | undefined>(undefined);
  const [geometry, setGeometry] = useState<LineGeometry>(PREVIEW_GEOMETRY);

  // Reset to the loading state when the target (or a retry) changes — during render, not in an
  // effect (React's adjust-state-on-prop-change pattern), so the pending state shows immediately.
  const [trackedKey, setTrackedKey] = useState(key);
  if (key !== trackedKey) {
    setTrackedKey(key);
    setState('pending');
    setReading(undefined);
  }

  useEffect(() => {
    let active = true;
    loadReading({ readingId, scanId })
      .then((res) => {
        if (!active) return;
        if (!res) {
          setState('error');
          return;
        }
        setReading(res.reading);
        setGeometry(res.geometry);
        setState('ready');
        track('reveal_viewed', { reading_id: res.id, kind: res.kind });
      })
      .catch(() => {
        if (active) setState('error');
      });
    return () => {
      active = false;
    };
  }, [readingId, scanId, reloads]);

  return (
    <RevealView
      reading={reading}
      geometry={geometry}
      state={state}
      onRetry={() => setReloads((r) => r + 1)}
    />
  );
}
