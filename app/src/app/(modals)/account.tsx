import { useLocalSearchParams, useRouter } from 'expo-router';
import { AccountSheet, type AccountReason } from '@/features/account/AccountSheet';

/**
 * Account creation sheet (UIUX §2.9, audit F0.8) — a modal route (like share / paywall) pushed from
 * the save/history, daily-fortune, compat-accept, and settings surfaces via `/account?reason=…`.
 * `mandatory=1` (compat-accept) removes the skip; `inviter` carries the pair partner's name for the
 * "so «Name» knows it's you" framing. On a successful link the sheet closes back to the caller.
 */
export default function Account() {
  const router = useRouter();
  const { reason, mandatory, inviter } = useLocalSearchParams<{ reason?: string; mandatory?: string; inviter?: string }>();
  const r: AccountReason =
    reason === 'compat' || reason === 'fortune' || reason === 'settings' ? reason : 'save';

  return (
    <AccountSheet
      reason={r}
      mandatory={mandatory === '1'}
      inviterName={typeof inviter === 'string' ? inviter : undefined}
      onClose={() => router.back()}
      onLinked={() => router.back()}
    />
  );
}
