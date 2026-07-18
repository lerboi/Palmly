import { useEffect, useState } from 'react';
import { FortuneHome } from '@/features/fortune/FortuneHome';
import { BirthDateSheet } from '@/features/fortune/BirthDateSheet';
import type { Fortune } from '@/features/fortune/fortune';
import { loadFortuneContext, loadTodayFortune, saveBirthDate, type FortuneContext } from '@/lib/fortuneData';
import { useEntitlement } from '@/lib/entitlements';
import { track } from '@/lib/analytics';

/**
 * Returning-user daily-fortune home (UIUX §2.11, audit F0.3 / F1.3). The honest free default:
 * entitlement comes from the free-by-default store (no hardcoded `premium`); the fortune is today's
 * real `fortune_templates` row for the caller's **day-pillar bucket** — derived from the birth date
 * they entered on first open (skippable → the `generic` bucket). No fake streak, no fabricated "Mei".
 * Premium fixtures live under `/dev/*` only.
 */
export default function FortuneScreen() {
  const { premium } = useEntitlement();
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [ctx, setCtx] = useState<FortuneContext | null>(null); // null → still loading the context
  const [showBirthSheet, setShowBirthSheet] = useState(false);
  const [savingBirth, setSavingBirth] = useState(false);

  useEffect(() => {
    // Retention signal (D1/D7/D30) — the user opened the daily fortune. Streak is the honest 0 until
    // real retention data lands (F1.T11); premium reflects the entitlement at open time.
    track('fortune_opened', { date: new Date().toISOString().slice(0, 10), premium, streak: 0 });
  }, [premium]);

  // Resolve the caller's context (birth_date → bucket). No birth date yet → offer the sheet on first open.
  useEffect(() => {
    let active = true;
    loadFortuneContext().then((c) => {
      if (!active) return;
      setCtx(c);
      if (!c.birthDate) setShowBirthSheet(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Load the fortune for the resolved bucket (re-runs when the bucket changes after a birth-date save).
  const bucket = ctx?.bucket ?? 'generic';
  useEffect(() => {
    if (!ctx) return; // wait for the context before reading
    let active = true;
    loadTodayFortune(bucket)
      .then((f) => active && setFortune(f))
      .catch(() => active && setFortune(null));
    return () => {
      active = false;
    };
  }, [ctx, bucket]);

  const onSaveBirth = (birthDate: string) => {
    setSavingBirth(true);
    void saveBirthDate(birthDate).then((b) => {
      setSavingBirth(false);
      setShowBirthSheet(false);
      setCtx({ birthDate, bucket: b ?? 'generic' }); // triggers the fortune reload with the new bucket
    });
  };

  if (showBirthSheet) {
    return <BirthDateSheet onSave={onSaveBirth} onSkip={() => setShowBirthSheet(false)} busy={savingBirth} />;
  }
  return <FortuneHome fortune={fortune} premium={premium} />;
}
