import { ShareView } from '@/features/reading/ShareView';
import { PREVIEW_GEOMETRY, PREVIEW_READING } from '@/features/reading/reveal';

/**
 * /dev preview — the Share sheet's compatibility variant (redesign R16). The live sheet defaults
 * to the solo variant; this stand-in starts on "Compatibility" so it is screenshot-verifiable.
 * Not shipped in production builds.
 */
export default function ShareCompatPreview() {
  return (
    <ShareView
      geometry={PREVIEW_GEOMETRY}
      headline={PREVIEW_READING.headline}
      score={82}
      partnerName="Mei"
      initialVariant="compat"
    />
  );
}
