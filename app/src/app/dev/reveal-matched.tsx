import { RevealView } from '@/features/reading/RevealView';
import { PREVIEW_GEOMETRY, PREVIEW_READING } from '@/features/reading/reveal';

/**
 * /dev preview — the reveal after a `matched` repeat scan (audit F1.10): the consistency micro-survey
 * ("You've scanned this before — does this match?") appears above the sections. Not shipped in prod.
 */
export default function RevealMatchedPreview() {
  return <RevealView reading={PREVIEW_READING} geometry={PREVIEW_GEOMETRY} kind="palm" state="ready" readingId="dev-matched" matched />;
}
