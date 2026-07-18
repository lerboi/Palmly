import { RevealView } from '@/features/reading/RevealView';
import { PREVIEW_GEOMETRY, PREVIEW_READING } from '@/features/reading/reveal';

/**
 * /dev preview — the Reveal screen's READY state, device-free (audit F1.6 verification). This is the
 * state that used to show the "Read my face" FaceOfferCard; with `FACE_READING_ENABLED = false` the
 * card is gone (F1.T7 re-enables it). Not shipped in production builds.
 */
export default function RevealReadyPreview() {
  return <RevealView reading={PREVIEW_READING} geometry={PREVIEW_GEOMETRY} state="ready" />;
}
