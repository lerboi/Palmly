import { FortuneHome } from '@/features/fortune/FortuneHome';
import { PREVIEW_FORTUNE } from '@/features/dev/fixtures';

/** /dev preview — the free (non-premium) Fortune home (redesign R18). Not shipped in production. */
export default function FortuneFreePreview() {
  return <FortuneHome fortune={PREVIEW_FORTUNE} premium={false} openedDates={['2026-07-23', '2026-07-24', '2026-07-25']} />;
}
