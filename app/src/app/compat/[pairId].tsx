import { Redirect, useLocalSearchParams, type Href } from 'expo-router';

/**
 * Deep-link redirect (audit F0.6, §6 deep-link hygiene). The push template `palmly://compat/{pairId}`
 * (`_shared/notif-templates.ts`) resolves here and forwards to the real pair-reveal route so a
 * compatibility notification tap opens the match.
 */
export default function CompatRedirect() {
  const { pairId } = useLocalSearchParams<{ pairId?: string }>();
  return <Redirect href={(pairId ? `/pair?pairId=${pairId}` : '/') as Href} />;
}
