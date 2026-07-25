import { RevealView } from '@/features/reading/RevealView';
import { ABSTRACT_GEOMETRY, PREVIEW_READING } from '@/features/reading/reveal';

/**
 * /dev preview — the PALM Reveal's READY state, device-free (audit F1.6 / F1.T7). With
 * `FACE_READING_ENABLED = true` this shows the "Read my face" FaceOfferCard cross-sell at the footer;
 * `/dev/reveal-face` is the face counterpart. Not shipped in production builds.
 */
export default function RevealReadyPreview() {
  return <RevealView reading={PREVIEW_READING} geometry={ABSTRACT_GEOMETRY} state="ready" />;
}
