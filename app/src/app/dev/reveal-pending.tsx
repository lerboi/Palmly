import { RevealView } from '@/features/reading/RevealView';
import { PREVIEW_GEOMETRY, PREVIEW_READING } from '@/features/reading/reveal';

/**
 * /dev preview — the Reveal screen's pending state (redesign R15). Screenshot-verifiable
 * device-free. Not shipped in production builds.
 */
export default function RevealPendingPreview() {
  return <RevealView reading={PREVIEW_READING} geometry={PREVIEW_GEOMETRY} state="pending" />;
}
