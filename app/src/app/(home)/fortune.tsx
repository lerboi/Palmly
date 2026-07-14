import { FortuneHome } from '@/features/fortune/FortuneHome';
import { PREVIEW_FORTUNE } from '@/features/fortune/fortune';

/**
 * Returning-user daily-fortune home (UIUX §2.11, P9.T3). Renders {@link FortuneHome}. Seeded with a
 * preview fortune + premium so the full almanac renders for the device-free web screenshot; the real
 * route loads the day's `fortune_templates` row for the user's pillar bucket and gates by entitlement.
 */
export default function Fortune() {
  return <FortuneHome fortune={PREVIEW_FORTUNE} premium streak={5} partnerName="Mei" />;
}
