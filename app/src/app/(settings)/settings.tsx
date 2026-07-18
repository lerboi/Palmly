import { SettingsHub } from '@/features/settings/SettingsHub';
import { useEntitlement } from '@/lib/entitlements';

/**
 * Settings hub (audit F0.3). The Plan row's premium/free identity comes from the free-by-default
 * entitlement store, not a hardcoded prop — a real subscription flips it to the premium badge; the
 * default (no subscriptions row) shows the honest "Upgrade" nudge. The premium fixture lives at
 * `/dev/settings-premium`.
 */
export default function Settings() {
  const { premium } = useEntitlement();
  return <SettingsHub premium={premium} />;
}
