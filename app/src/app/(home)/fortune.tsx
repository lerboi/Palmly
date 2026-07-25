import { useEffect, useState } from 'react';
import { FortuneHome } from '@/features/fortune/FortuneHome';
import { BirthDateSheet } from '@/features/fortune/BirthDateSheet';
import type { Fortune } from '@/features/fortune/fortune';
import { loadFortuneContext, loadTodayFortune, saveBirthDate, type FortuneContext } from '@/lib/fortuneData';
import { useEntitlement } from '@/lib/entitlements';
import { hasFirstReadingComplete } from '@/lib/session';
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
  // The request's own state, tracked explicitly (SH-1). A missing fortune used to stand in for
  // "loading" AND "failed" AND "new user", so all three rendered the first-run hero.
  const [failed, setFailed] = useState(false);
  const [reloads, setReloads] = useState(0);
  // Is this user genuinely new? Answered by the session's first-reading flag, NOT by the absence
  // of a fortune row — that is the whole of SH-1.
  const [firstRun, setFirstRun] = useState<boolean | undefined>(undefined);
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
    hasFirstReadingComplete().then((done) => active && setFirstRun(!done));
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
      .then((f) => {
        if (!active) return;
        setFortune(f);
        setFailed(false); // cleared on RESOLVE, not synchronously in the effect body (lint rule)
      })
      .catch(() => {
        if (!active) return;
        setFortune(null);
        setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [ctx, bucket, reloads]);

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
  // Loading until BOTH the context and the first-run answer are known — resolving one without the
  // other is how the flash used to slip through.
  const loading = !ctx || firstRun === undefined;
  return (
    <FortuneHome
      fortune={fortune}
      premium={premium}
      loading={loading}
      error={failed}
      firstRun={firstRun}
      onRetry={() => setReloads((n) => n + 1)}
    />
  );
}
