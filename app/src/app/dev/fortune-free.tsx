import { FortuneHome } from '@/features/fortune/FortuneHome';
import { PREVIEW_FORTUNE } from '@/features/fortune/fortune';

/** /dev preview — the free (non-premium) Fortune home (redesign R18). Not shipped in production. */
export default function FortuneFreePreview() {
  return <FortuneHome fortune={PREVIEW_FORTUNE} premium={false} streak={3} />;
}
