import { RevealView } from '@/features/reading/RevealView';
import { ABSTRACT_GEOMETRY, PREVIEW_READING } from '@/features/reading/reveal';

/**
 * /dev preview — the Reveal screen's error state (redesign v2 V13). Screenshot-verifiable
 * device-free; passes a real `onRetry` so the "Try again" CTA is honest. Not shipped in production.
 */
export default function RevealErrorPreview() {
  return (
    <RevealView
      reading={PREVIEW_READING}
      geometry={ABSTRACT_GEOMETRY}
      state="error"
      onRetry={() => {}}
    />
  );
}
