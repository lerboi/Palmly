import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { SealCheckIn } from '@/features/checkin/SealCheckIn';
import { loadHistory, loadReading } from '@/lib/readings';
import type { StoredHandSignature } from '@/lib/readings';
import { loadCachedLedger, recordDay } from '@/lib/dailyLedger';
import { loadFortuneContext } from '@/lib/fortuneData';
import { track } from '@/lib/analytics';
import { currentRun } from '@/features/pulse/streak';
import { localDateKey } from '@/features/fortune/openHistory';

/**
 * Seal the day (Audit-5 · 02 §6, RF3.T2) — the on-device palm check-in.
 *
 * This route owns three things and nothing else: fetching the enrolled signature, recording the
 * seal, and getting the user back to Today. The camera work, the match, and the timeout ladder live
 * in the feature; the ritual itself never uploads anything, so there is no network call here except
 * the ledger write that any tap would also make.
 *
 * Both exits — the palm match and the tap fallback — write the same day. That is the point: the
 * ritual is the deluxe seal, never the only one (01 §3).
 */
export default function CheckIn() {
  const router = useRouter();
  const [enrolled, setEnrolled] = useState<StoredHandSignature | null>(null);
  const [bucket, setBucket] = useState('generic');
  const [day, setDay] = useState<number | undefined>(undefined);
  const [openedAt] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    // The enrolled signature comes from the newest reading's feature_set (owner RLS). The cached
    // ledger supplies the day number for the success line without waiting on a round trip.
    void (async () => {
      const [rows, cached, ctx] = await Promise.all([loadHistory(), loadCachedLedger(), loadFortuneContext()]);
      if (!active) return;
      setBucket(ctx.bucket);
      // The seal about to happen is today's, so the number to show is the run INCLUDING today.
      const alreadySealed = cached.sealedDates.includes(localDateKey(new Date()));
      setDay(currentRun(cached.sealedDates, localDateKey(new Date())) + (alreadySealed ? 0 : 1));
      const newest = rows[0];
      if (!newest) return;
      const loaded = await loadReading({ readingId: newest.id });
      if (active && loaded) setEnrolled(loaded.handSignature);
    })();
    return () => {
      active = false;
    };
  }, []);

  const seal = (method: 'tap' | 'palm') => {
    track('pulse_sealed', { method, matched: method === 'palm', attempt_ms: Date.now() - openedAt });
    void recordDay({ bucket, method, revealed: true });
    router.back();
  };

  return (
    <SealCheckIn
      enrolled={enrolled}
      day={day}
      onSealed={() => seal('palm')}
      onTapInstead={() => seal('tap')}
      onClose={() => router.back()}
    />
  );
}
