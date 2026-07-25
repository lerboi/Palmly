import { RevealView } from '@/features/reading/RevealView';
import { ABSTRACT_GEOMETRY, PREVIEW_READING } from '@/features/reading/reveal';

/**
 * /dev preview — the Reveal screen's pending state (redesign R15). Screenshot-verifiable
 * device-free. Not shipped in production builds.
 */
export default function RevealPendingPreview() {
  return <RevealView reading={PREVIEW_READING} geometry={ABSTRACT_GEOMETRY} state="pending" />;
}
