import { RevealView } from '@/features/reading/RevealView';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';
import { PREVIEW_ALL_SECTIONS_READING } from './fixtures';

/**
 * /dev preview — every PALM section key free at once, so the seven section thumbs can be compared
 * side by side device-free (Audit-4 CO-5). The canonical `/dev/reveal-ready` fixture only carries
 * three free sections, which is not enough to prove that hand shape, mounts and markings stopped
 * rendering the same grey palm as each other. Not shipped in production builds.
 */
export default function RevealSectionsPreview() {
  return <RevealView reading={PREVIEW_ALL_SECTIONS_READING} geometry={PREVIEW_GEOMETRY} state="ready" />;
}
