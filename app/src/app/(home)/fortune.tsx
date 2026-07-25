import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { FortuneHome } from '@/features/fortune/FortuneHome';
import { BirthDateSheet } from '@/features/fortune/BirthDateSheet';
import type { Fortune } from '@/features/fortune/fortune';
import { loadFortuneContext, loadTodayFortune, saveBirthDate, type FortuneContext } from '@/lib/fortuneData';
import { useEntitlement } from '@/lib/entitlements';
import { hasFirstReadingComplete, setBirthDateSkipped, wasBirthDateSkipped } from '@/lib/session';
import { markFortuneOpened } from '@/lib/fortuneOpens';
import { streakRun } from '@/features/fortune/openHistory';
import { homeState, shouldAskBirthDate } from '@/features/fortune/fortune';
import { track } from '@/lib/analytics';

/**
 * Returning-user daily-fortune home (UIUX §2.11, audit F0.3 / F1.3). The honest free default:
 * entitlement comes from the free-by-default store (no hardcoded `premium`); the fortune is today's
 * real `fortune_templates` row for the caller's **day-pillar bucket** — derived from the birth date
 * they entered on first open (skippable → the `generic` bucket). No fake streak, no fabricated "Mei".
 * Premium fixtures live under `/dev/*` only.
 */
export default function FortuneScreen() {
  const { premium, loading: entitlementLoading } = useEntitlement();
  const [fortune, setFortune] = useState<Fortune | null>(null);
  // The request's own state, tracked explicitly (SH-1). A missing fortune used to stand in for
  // "loading" AND "failed" AND "new user", so all three rendered the first-run hero.
  const [failed, setFailed] = useState(false);
  const [reloads, setReloads] = useState(0);
  // Is this user genuinely new? Answered by the session's first-reading flag, NOT by the absence
  // of a fortune row — that is the whole of SH-1.
  const [firstRun, setFirstRun] = useState<boolean | undefined>(undefined);
  // The days this user opened their fortune — drives the week strip and the REAL streak (SH-9).
  const [openedDates, setOpenedDates] = useState<string[]>([]);
  const [ctx, setCtx] = useState<FortuneContext | null>(null); // null → still loading the context
  const [savingBirth, setSavingBirth] = useState(false);
  const [birthSaveFailed, setBirthSaveFailed] = useState(false);
  // Skip is PERSISTED now (SH-4) — the sheet used to re-nag on every open, forever.
  const [birthSkipped, setBirthSkipped] = useState<boolean | undefined>(undefined);
  // Settings' "Add birth date" row re-opens the sheet even after a permanent skip.
  const { birthDate: reopenBirth } = useLocalSearchParams<{ birthDate?: string }>();

  useEffect(() => {
    // Retention signal (D1/D7/D30). Recording the open and reporting the streak are the same act:
    // `streak` was hardcoded 0 before (SH-9), so the funnel could never see a habit forming.
    let active = true;
    void markFortuneOpened().then((dates) => {
      if (!active) return;
      setOpenedDates(dates);
      track('fortune_opened', {
        date: new Date().toISOString().slice(0, 10),
        premium,
        streak: streakRun(new Date(), dates),
      });
    });
    return () => {
      active = false;
    };
  }, [premium]);

  // Resolve the caller's context (birth_date → bucket). No birth date yet → offer the sheet on first open.
  useEffect(() => {
    let active = true;
    loadFortuneContext().then((c) => {
      if (!active) return;
      setCtx(c);
    });
    wasBirthDateSkipped().then((v) => active && setBirthSkipped(v));
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
    setBirthSaveFailed(false);
    void saveBirthDate(birthDate)
      .then((b) => {
        setSavingBirth(false);
        setCtx({ birthDate, bucket: b ?? 'generic' }); // triggers the fortune reload with the new bucket
      })
      .catch(() => {
        // Keep the sheet up with a warm inline error. A silent failure used to just re-ask next
        // launch, with no sign anything had gone wrong (SH-4).
        setSavingBirth(false);
        setBirthSaveFailed(true);
      });
  };

  const onSkipBirth = () => {
    setBirthSkipped(true);
    void setBirthDateSkipped();
  };

  // Loading until BOTH the context and the first-run answer are known — resolving one without the
  // other is how the flash used to slip through.
  const loading = !ctx || firstRun === undefined;
  // The sheet is offered only AFTER the fortune is on screen — value first, never a blocker (SH-4).
  const askBirth = shouldAskBirthDate({
    fortuneReady: homeState({ loading, entitlementLoading, error: failed, firstRun, fortune }) === 'ready',
    birthDate: ctx?.birthDate,
    skipped: reopenBirth === '1' ? false : birthSkipped,
  });
  return (
    <>
      <FortuneHome
        fortune={fortune}
        premium={premium}
        loading={loading}
        entitlementLoading={entitlementLoading}
        error={failed}
        firstRun={firstRun}
        openedDates={openedDates}
        onRetry={() => setReloads((n) => n + 1)}
      />
      {askBirth ? (
        <BirthDateSheet onSave={onSaveBirth} onSkip={onSkipBirth} busy={savingBirth} failed={birthSaveFailed} />
      ) : null}
    </>
  );
}
