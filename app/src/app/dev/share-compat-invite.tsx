import { ShareView } from '@/features/reading/ShareView';
import { PREVIEW_GEOMETRY, PREVIEW_READING } from '@/features/reading/reveal';

/**
 * /dev preview — the compat tab with **no pair yet** (Audit-4 SH-7). This is what opening
 * "Compare palms" from a reveal shows: an invite, not a fabricated 0-out-of-100 card for
 * "Your match". Not shipped in production builds.
 */
export default function ShareCompatInvitePreview() {
  return <ShareView geometry={PREVIEW_GEOMETRY} headline={PREVIEW_READING.headline} initialVariant="compat" />;
}
