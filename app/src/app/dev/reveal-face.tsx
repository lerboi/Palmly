import { RevealView } from '@/features/reading/RevealView';
import { ABSTRACT_GEOMETRY, PREVIEW_FACE_READING } from '@/features/reading/reveal';

/**
 * /dev preview — the FACE reveal's ready state, device-free (audit F1.6 / F1.T7). A face hero motif,
 * physiognomy section cards (Elemental Face / Balance & Proportion / Eyes), face tradition footnotes,
 * and the palm cross-sell — clearly distinct from the palm reveal. Not shipped in production builds.
 */
export default function RevealFacePreview() {
  return <RevealView reading={PREVIEW_FACE_READING} geometry={ABSTRACT_GEOMETRY} kind="face" state="ready" />;
}
