import { FortuneHome } from '@/features/fortune/FortuneHome';
import { PREVIEW_FORTUNE } from '@/features/fortune/fortune';

/** /dev preview — the first-run (no reading yet) Fortune home (redesign R18). Not shipped. */
export default function FortuneEmptyPreview() {
  return <FortuneHome fortune={PREVIEW_FORTUNE} premium={false} openedDates={[]} firstRun />;
}
