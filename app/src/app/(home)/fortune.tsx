import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { FortuneHome } from '@/features/fortune/FortuneHome';
import { BirthDateSheet } from '@/features/fortune/BirthDateSheet';
import type { Fortune } from '@/features/fortune/fortune';
import { loadFortuneContext, loadTodayFortune, saveBirthDate, type FortuneContext } from '@/lib/fortuneData';
import { useEntitlement } from '@/lib/entitlements';
import { hasFirstReadingComplete, setBirthDateSkipped, wasBirthDateSkipped } from '@/lib/session';
import { migrateLocalOpens, recordDay } from '@/lib/dailyLedger';
import { homeState, shouldAskBirthDate } from '@/features/fortune/fortune';
import { track } from '@/lib/analytics';
import { PULSE_ENABLED } from '@/lib/capabilities';
import { usePulse } from '@/features/pulse/usePulse';
import { PulseCard, PulseCardSkeleton, askDailyPrefill } from '@/features/pulse/PulseCard';
import { ChapterSheet } from '@/features/pulse/ChapterSheet';
import { BoundaryBanner } from '@/features/pulse/BoundaryBanner';
import { MilestoneMoment } from '@/features/pulse/MilestoneMoment';
import { describeChapter } from '@/features/pulse/chapters';
import { deviceLocale } from '@/lib/locale';
import { sealCameraSupported, sealWithCameraEnabled } from '@/features/checkin/sealPreference';

/**
 * Today (UIUX §2.11, audit F0.3 / F1.3; recomposed at Audit-5 RF2.T3).
 *
 * The honest free default is unchanged: entitlement comes from the free-by-default store, the
 * almanac is today's real `fortune_templates` row for the caller's day-pillar bucket, no fake
 * streak. What changed is the hierarchy — **Today's Line is now the single `md` hero** and the
 * almanac renders flat beneath it (02 §3), and the week strip reads the SERVER ledger instead of a
 * device-local list.
 */
export default function FortuneScreen() {
  const router = useRouter();
  const { premium, loading: entitlementLoading } = useEntitlement();
  const [fortune, setFortune] = useState<Fortune | null>(null);
  // The request's own state, tracked explicitly (SH-1). A missing fortune used to stand in for
  // "loading" AND "failed" AND "new user", so all three rendered the first-run hero.
  const [failed, setFailed] = useState(false);
  const [reloads, setReloads] = useState(0);
  // Is this user genuinely new? Answered by the session's first-reading flag, NOT by the absence
  // of a fortune row — that is the whole of SH-1.
  const [firstRun, setFirstRun] = useState<boolean | undefined>(undefined);
  const [ctx, setCtx] = useState<FortuneContext | null>(null); // null → still loading the context
  const [savingBirth, setSavingBirth] = useState(false);
  const [birthSaveFailed, setBirthSaveFailed] = useState(false);
  // Skip is PERSISTED now (SH-4) — the sheet used to re-nag on every open, forever.
  const [birthSkipped, setBirthSkipped] = useState<boolean | undefined>(undefined);
  // Settings' "Add birth date" row re-opens the sheet even after a permanent skip.
  const { birthDate: reopenBirth } = useLocalSearchParams<{ birthDate?: string }>();
  const [chapterOpen, setChapterOpen] = useState(false);
  // The "Seal with your palm" link is offered only where a camera exists AND the reader has not
  // turned the flourish off (02 §8). Resolved async, defaulting to hidden, so the link never
  // flashes in and out as the preference loads.
  const [offerSeal, setOfferSeal] = useState(false);

  const bucket = ctx?.bucket ?? 'generic';
  const pulse = usePulse({ bucket, disabled: !PULSE_ENABLED });
  const locale = deviceLocale();
  const chapter = useMemo(() => describeChapter(pulse.chapter, pulse.featureKey), [pulse.chapter, pulse.featureKey]);

  // One-time: replay the device's old local open-history into the server ledger, so nobody's streak
  // resets on the day the ledger ships (03 §6). Idempotent and latched; safe to call every launch.
  useEffect(() => {
    void migrateLocalOpens();
  }, []);

  useEffect(() => {
    if (!sealCameraSupported()) return;
    let active = true;
    void sealWithCameraEnabled().then((v) => active && setOfferSeal(v));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // Retention signal (D1/D7/D30). Recording the open and reporting the streak are the same act:
    // `streak` was hardcoded 0 before (SH-9), so the funnel could never see a habit forming.
    let active = true;
    void recordDay({ bucket }).then((r) => {
      if (!active) return;
      track('fortune_opened', { date: new Date().toISOString().slice(0, 10), premium, streak: r.currentStreak });
    });
    return () => {
      active = false;
    };
  }, [bucket, premium]);

  // Resolve the caller's context (birth_date → bucket). No birth date yet → offer the sheet on first open.
  useEffect(() => {
    let active = true;
    loadFortuneContext()
      .catch(() => ({ birthDate: null, bucket: 'generic' }) as FortuneContext)
      .then((c) => {
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

  const onReveal = () => {
    void pulse.reveal('tap');
    track('pulse_revealed', { feature_key: pulse.featureKey ?? 'unknown', method: 'tap', streak: pulse.streak, premium });
  };

  /**
   * The merged daily card (RF6.T2). It needs BOTH halves resolved, so it waits on the fortune as
   * well as the pulse — but only the FORTUNE is load-bearing: if the night's personal template is
   * missing, the card renders the almanac alone rather than an error, because a degraded day is
   * still a day. `firstRun` is handled by `FortuneHome`'s own hero, so the slot stays empty there —
   * there is no line of the day until a reading exists, and the first-run CTA already says exactly
   * the right thing ("Read my palm").
   */
  const dayReady = homeState({ loading, entitlementLoading, error: failed, firstRun, fortune }) === 'ready';
  const pulseSlot = !PULSE_ENABLED || pulse.state === 'firstRun' || !fortune || !dayReady
    ? undefined
    : pulse.state === 'loading'
      ? <PulseCardSkeleton />
      : (
          <PulseCard
            fortune={fortune}
            // Null on a pulse error — the almanac-only day. `PulseCard` handles it; the error card
            // is now reserved for the almanac itself failing, which really is the whole day.
            featureKey={pulse.state === 'error' ? null : pulse.featureKey}
            pulse={pulse.state === 'error' ? null : pulse.pulse}
            geometry={pulse.geometry}
            chapter={chapter}
            premium={premium}
            revealed={pulse.revealed}
            locale={locale}
            onReveal={onReveal}
            // Native only, and only if the reader wants the flourish: there is no camera ritual to
            // offer on web, so the link is not shown rather than shown-and-broken (the
            // capability-gate idiom, like the torch).
            onSealWithPalm={offerSeal ? () => router.push('/checkin' as Href) : undefined}
            onUnlock={() => router.push(`/paywall?trigger=pulse_full&section=${pulse.featureKey ?? ''}` as Href)}
            onOpenChapter={
              chapter
                ? () => {
                    track('chapter_viewed', { feature_key: pulse.featureKey ?? 'unknown', boundary: chapter.is_boundary });
                    setChapterOpen(true);
                  }
                : undefined
            }
            onAsk={(q) => router.push(`/chat?q=${encodeURIComponent(q)}` as Href)}
          />
        );

  return (
    <>
      <FortuneHome
        fortune={fortune}
        premium={premium}
        loading={loading}
        entitlementLoading={entitlementLoading}
        error={failed}
        firstRun={firstRun}
        openedDates={pulse.sealedDates}
        sealedWithPalm={pulse.palmSealedDates}
        streak={pulse.streak}
        onSealWithPalm={offerSeal ? () => router.push('/checkin' as Href) : undefined}
        pulseSlot={pulseSlot}
        boundarySlot={
          chapter?.is_boundary && pulse.featureKey ? (
            <BoundaryBanner
              featureKey={pulse.featureKey}
              onPress={() => {
                track('chapter_viewed', { feature_key: pulse.featureKey ?? 'unknown', boundary: true });
                if (premium) setChapterOpen(true);
                else router.push('/paywall?trigger=cycle_boundary' as Href);
              }}
            />
          ) : undefined
        }
        onRetry={() => setReloads((n) => n + 1)}
      />
      {askBirth ? (
        <BirthDateSheet onSave={onSaveBirth} onSkip={onSkipBirth} busy={savingBirth} failed={birthSaveFailed} />
      ) : null}
      {chapter && pulse.featureKey ? (
        <ChapterSheet
          visible={chapterOpen}
          chapter={chapter}
          featureKey={pulse.featureKey}
          geometryHash={pulse.geometryHash}
          premium={premium}
          locale={locale}
          onClose={() => setChapterOpen(false)}
          onUnlock={() => {
            setChapterOpen(false);
            router.push('/paywall?trigger=cycle_boundary' as Href);
          }}
        />
      ) : null}
      {pulse.milestone ? (
        <MilestoneMoment
          visible
          day={pulse.milestone}
          onShown={(day) => track('milestone_reached', { day })}
          premium={premium}
          onShare={() => {
            pulse.clearMilestone();
            router.push('/share?source=home' as Href);
          }}
          onDismiss={pulse.clearMilestone}
        />
      ) : null}
    </>
  );
}

/** The chat bridge's prefill, re-exported so the daily card and this route cannot drift. */
export { askDailyPrefill };
