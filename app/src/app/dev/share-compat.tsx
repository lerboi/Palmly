import { ShareView } from '@/features/reading/ShareView';
import { ABSTRACT_GEOMETRY, PREVIEW_READING } from '@/features/reading/reveal';
import { PREVIEW_COMPAT_SHARE } from './fixtures';

/**
 * /dev preview — the Share sheet's compatibility variant (redesign R16). The live sheet defaults
 * to the solo variant; this stand-in starts on "Compatibility" so it is screenshot-verifiable.
 * Not shipped in production builds.
 */
export default function ShareCompatPreview() {
  return (
    <ShareView
      geometry={ABSTRACT_GEOMETRY}
      headline={PREVIEW_READING.headline}
      pair={PREVIEW_COMPAT_SHARE}
      initialVariant="compat"
    />
  );
}
