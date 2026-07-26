import { useCallback, useEffect, useRef, useState } from 'react';
import type { LineGeometry } from '@/components/palm-diagram/geometry';
import { localDateKey } from '@/features/fortune/openHistory';
import { loadCachedLedger, loadLedger, recordDay, type LedgerState } from '@/lib/dailyLedger';
import { loadSubjectKinds, loadTodayPulse, type Pulse } from '@/lib/pulseData';
import { loadHistory, loadReading } from '@/lib/readings';
import { supabase } from '@/lib/supabase';
import { chapterForSafe, pulseFeatureKey, type Chapter, type SubjectKind } from './pulseMath';
import { milestoneReached, type StreakMilestone } from './streak';

/**
 * The Today's Line screen hook (Audit-5 · 03 §6).
 *
 * One effect resolves the whole chain — identity → subject kinds → today's feature → template →
 * geometry → ledger — behind a single `active` cancellation flag, in the shape `useEntitlement`
 * established. Resolving it in one place is what lets the card obey the Audit-4 rules it inherits:
 * ONE state at a time, no reflow as pieces arrive, and an error that never impersonates first-run
 * (SH-1).
 *
 * The states are deliberately few and total:
 *   `loading`   — still resolving; the card shows a skeleton
 *   `firstRun`  — no canonical reading exists, so there is no line of the day at all
 *   `error`     — the day's template is missing or the read failed → retry, never invented content
 *   `ready`     — a real feature, a real template, and the reader's own geometry
 */
export type PulseState = 'loading' | 'firstRun' | 'error' | 'ready';

export interface PulseData {
  state: PulseState;
  /** Which of the reader's own features today reads. */
  featureKey: string | null;
  pulse: Pulse | null;
  /** The reader's own line geometry, for the lit diagram. Empty until a reading loads. */
  geometry: LineGeometry;
  chapter: Chapter | null;
  /** The reader's own `feature_hash` — what seeds their chapter schedule. Empty until a reading loads. */
  geometryHash: string;
  /** Today's line has been revealed — server truth, so it persists all day and across devices. */
  revealed: boolean;
  /** How today was sealed, if it was. */
  sealMethod: 'tap' | 'palm' | null;
  streak: number;
  longestStreak: number;
  sealedDates: string[];
  /** The subset sealed with the camera ritual — the week strip's chop glyph. */
  palmSealedDates: string[];
  /** A milestone this session's seal just reached, for the celebration sheet. Cleared once shown. */
  milestone: StreakMilestone | null;
  reveal: (method?: 'tap' | 'palm') => Promise<void>;
  clearMilestone: () => void;
  retry: () => void;
}

/** Nothing invented: every field starts empty and only real data fills it. */
const EMPTY_GEOMETRY: LineGeometry = {};

export interface UsePulseOptions {
  /** The reader's pillar bucket, for the ledger row. Defaults to `generic` like the fortune does. */
  bucket?: string;
  /** Frozen "now" for fixtures and tests. */
  now?: Date;
  /** Skip every network read — the `/dev` fixture routes drive the card directly. */
  disabled?: boolean;
}

export function usePulse(options: UsePulseOptions = {}): PulseData {
  const { bucket = 'generic', disabled = false } = options;
  const [now] = useState(() => options.now ?? new Date());
  const dateKey = localDateKey(now);

  const [state, setState] = useState<PulseState>('loading');
  const [featureKey, setFeatureKey] = useState<string | null>(null);
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [geometry, setGeometry] = useState<LineGeometry>(EMPTY_GEOMETRY);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [geometryHash, setGeometryHash] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [sealMethod, setSealMethod] = useState<'tap' | 'palm' | null>(null);
  const [ledger, setLedger] = useState<LedgerState>({ sealedDates: [], palmSealedDates: [], currentStreak: 0, longestStreak: 0 });
  const [milestone, setMilestone] = useState<StreakMilestone | null>(null);
  const [reloads, setReloads] = useState(0);

  // Milestones celebrated during THIS run, so one seal cannot fire the sheet twice. Held in a ref
  // (not state) because it must not re-render anything and must survive the reveal round trip.
  const celebrated = useRef<number[]>([]);

  useEffect(() => {
    if (disabled) return;
    let active = true;

    (async () => {
      // The cached ledger paints the week strip immediately, before any network answers (03 §7:
      // an offline cold open shows the strip, not a blank).
      const cached = await loadCachedLedger();
      if (!active) return;
      setLedger(cached);

      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!active) return;
      if (!uid) {
        setState('error');
        return;
      }

      const kinds = (await loadSubjectKinds()) as SubjectKind[];
      if (!active) return;
      const key = pulseFeatureKey(uid, dateKey, kinds);
      if (!key) {
        // No canonical reading yet. Today's Line simply does not exist for this user — the screen
        // keeps its existing first-run hero, and the CTA there already says the right thing.
        setState('firstRun');
        return;
      }
      setFeatureKey(key);

      const [content, todayRow, fresh] = await Promise.all([
        loadTodayPulse(key, undefined, now),
        readTodayRow(dateKey),
        loadLedger(400, now),
      ]);
      if (!active) return;

      setLedger(fresh);
      setRevealed(todayRow?.revealed === true);
      setSealMethod(todayRow?.method ?? null);

      if (!content) {
        // The night's row is missing. This is the honest error card + retry, never a fabricated
        // reading and never the first-run hero (03 §7).
        setState('error');
        return;
      }
      setPulse(content);

      // The card draws the reader's PALM, so it needs a palm reading — not merely the newest one.
      // Found live on the S20+ 2026-07-27: this reader's newest reading was a FACE reading, whose
      // feature_set has no `line_geometry`, so the hero rendered with no diagram at all even though
      // a perfectly good palm reading sat one row below it. The newest PALM wins for the diagram;
      // the newest reading of any kind is the fallback, which still gives the chapter a stable seed.
      //
      // A missing reading is not fatal to the reading itself — the card can still show the words —
      // so this leg never flips the state.
      const rows = await loadHistory();
      if (!active) return;
      const newest = rows.find((r) => r.kind === 'palm') ?? rows[0];
      if (newest) {
        const loaded = await loadReading({ readingId: newest.id });
        if (!active) return;
        if (loaded) {
          // The chapter schedule is seeded by the reader's own feature hash. Falling back to the
          // reading id keeps the chapter STABLE for that reader (an id never changes) rather than
          // letting it jump between opens — a chapter whose dates moved would be worse than none.
          const hash = loaded.featureHash ?? newest.id;
          setGeometry(loaded.geometry);
          setGeometryHash(hash);
          setChapter(chapterForSafe(key, hash, dateKey));
        }
      }
      setState('ready');
    })().catch(() => {
      if (active) setState('error');
    });

    return () => {
      active = false;
    };
  }, [dateKey, disabled, now, reloads]);

  /**
   * Reveal today's line — and, with it, seal the day.
   *
   * A tap seals exactly as truly as the palm ritual does (02 §6): friction never gates a daily. The
   * milestone celebration fires only on the SERVER's `first_seal_today`, so a second device, a
   * re-open, or an offline estimate can never re-trigger it.
   */
  const reveal = useCallback(
    async (method: 'tap' | 'palm' = 'tap') => {
      setRevealed(true); // optimistic: the reveal animation must not wait on a round trip
      setSealMethod((prev) => (prev === 'palm' ? 'palm' : method));
      const result = await recordDay({ bucket, featureKey, method, revealed: true, now });
      setLedger({
        sealedDates: result.sealedDates,
        palmSealedDates: result.palmSealedDates,
        currentStreak: result.currentStreak,
        longestStreak: result.longestStreak,
      });
      if (result.synced && result.firstSealToday) {
        const hit = milestoneReached(result.currentStreak, celebrated.current);
        if (hit) {
          celebrated.current = [...celebrated.current, hit];
          setMilestone(hit);
        }
      }
    },
    [bucket, featureKey, now],
  );

  return {
    state,
    featureKey,
    pulse,
    geometry,
    chapter,
    geometryHash,
    revealed,
    sealMethod,
    streak: ledger.currentStreak,
    longestStreak: ledger.longestStreak,
    sealedDates: ledger.sealedDates,
    palmSealedDates: ledger.palmSealedDates,
    milestone,
    reveal,
    clearMilestone: useCallback(() => setMilestone(null), []),
    retry: useCallback(() => setReloads((n) => n + 1), []),
  };
}

/** Today's ledger row — whether the line is already revealed, and how the day was sealed. */
async function readTodayRow(dateKey: string): Promise<{ revealed: boolean; method: 'tap' | 'palm' | null } | null> {
  try {
    const { data, error } = await supabase
      .from('user_fortunes')
      .select('revealed_at, seal_method')
      .eq('fortune_date', dateKey)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as { revealed_at: string | null; seal_method: 'tap' | 'palm' | null };
    return { revealed: row.revealed_at != null, method: row.seal_method };
  } catch {
    return null;
  }
}
