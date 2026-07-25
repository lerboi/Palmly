import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { RevealView, type ReadingKind, type RevealState } from '@/features/reading/RevealView';
import { PREVIEW_GEOMETRY, type Reading } from '@/features/reading/reveal';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { loadHistory, loadReading } from '@/lib/readings';
import { setFirstReadingComplete } from '@/lib/session';
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
  const { readingId, scanId, matched } = useLocalSearchParams<{ readingId?: string; scanId?: string; matched?: string }>();
  const [reloads, setReloads] = useState(0);
  const key = `${readingId ?? ''}|${scanId ?? ''}|${reloads}`;

  const [state, setState] = useState<RevealState>('pending');
  const [reading, setReading] = useState<Reading | undefined>(undefined);
  const [geometry, setGeometry] = useState<LineGeometry>(PREVIEW_GEOMETRY);
  const [loadedId, setLoadedId] = useState<string | undefined>(undefined);
  const [kind, setKind] = useState<ReadingKind>('palm');
  const [photoDeletedAt, setPhotoDeletedAt] = useState<string | null>(null);
  const [photoKept, setPhotoKept] = useState(false);
  // SH-10: don't offer a reading the user already has. Their own shelf is the honest source.
  const [owned, setOwned] = useState<{ hand: boolean; kind: boolean }>({ hand: false, kind: false });

  // Reset to the loading state when the target (or a retry) changes — during render, not in an
  // effect (React's adjust-state-on-prop-change pattern), so the pending state shows immediately.
  const [trackedKey, setTrackedKey] = useState(key);
  if (key !== trackedKey) {
    setTrackedKey(key);
    setState('pending');
    setReading(undefined);
    setLoadedId(undefined);
    setPhotoDeletedAt(null);
    setPhotoKept(false);
  }

  // Own effect, keyed on the resolved `kind`: "do they already have the other kind?" cannot be
  // answered until we know which kind THIS reading is (SH-10).
  useEffect(() => {
    let active = true;
    loadHistory().then((rows) => {
      if (!active) return;
      setOwned({
        // A second palm reading implies the other hand; the shelf does not record side per row.
        hand: rows.filter((r) => r.kind === 'palm').length > 1,
        kind: rows.some((r) => r.kind === (kind === 'face' ? 'palm' : 'face')),
      });
    });
    return () => {
      active = false;
    };
  }, [kind]);

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
        setLoadedId(res.id);
        setKind(res.kind);
        setPhotoDeletedAt(res.photoDeletedAt);
        setPhotoKept(res.photoKept);
        setState('ready');
        void setFirstReadingComplete(); // returning-user redirect (F0.7): this user now has a reading
        track('reveal_viewed', { reading_id: res.id, kind: res.kind });
      })
      .catch(() => {
        if (active) setState('error');
      });
    return () => {
      active = false;
    };
  }, [readingId, scanId, reloads]);

  // reveal_time_spent (A7 — depth of engagement with the reveal): start the clock when the reading
  // lands, emit the elapsed ms when the user leaves the reveal (unmount) or opens a different reading.
  useEffect(() => {
    if (state !== 'ready' || !loadedId) return;
    const startedAt = Date.now();
    return () => {
      track('reveal_time_spent', { reading_id: loadedId, ms: Date.now() - startedAt });
    };
  }, [state, loadedId]);

  return (
    <RevealView
      reading={reading}
      geometry={geometry}
      state={state}
      kind={kind}
      readingId={loadedId}
      photoDeletedAt={photoDeletedAt}
      photoKept={photoKept}
      matched={matched === '1'}
      hasOtherHand={owned.hand}
      hasOtherKind={owned.kind}
      onRetry={() => setReloads((r) => r + 1)}
    />
  );
}
