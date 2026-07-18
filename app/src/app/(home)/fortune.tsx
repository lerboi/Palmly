import { useEffect, useState } from 'react';
import { FortuneHome } from '@/features/fortune/FortuneHome';
import type { Fortune } from '@/features/fortune/fortune';
import { loadTodayFortune } from '@/lib/fortuneData';
import { useEntitlement } from '@/lib/entitlements';

/**
 * Returning-user daily-fortune home (UIUX §2.11, audit F0.3). The honest free default: entitlement
 * comes from the free-by-default store (no hardcoded `premium`), the fortune is today's real
 * `fortune_templates` row for the `generic` bucket (a fresh profile's only match until the birth-date
 * sheet lands in F1.T3), and there is **no fake streak and no fabricated "Mei" partner** — the streak
 * strip stays hidden until real retention data exists (F1.T11) and the red-thread row renders only
 * from a real pending invite (F0.T6). Premium fixtures live under `/dev/*` only.
 */
export default function FortuneScreen() {
  const { premium } = useEntitlement();
  const [fortune, setFortune] = useState<Fortune | null>(null);

  useEffect(() => {
    let active = true;
    loadTodayFortune()
      .then((f) => active && setFortune(f))
      .catch(() => active && setFortune(null));
    return () => {
      active = false;
    };
  }, []);

  return <FortuneHome fortune={fortune} premium={premium} />;
}
