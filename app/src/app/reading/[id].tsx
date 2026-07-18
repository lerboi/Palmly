import { Redirect, useLocalSearchParams, type Href } from 'expo-router';

/**
 * Deep-link redirect (audit F0.6, §6 deep-link hygiene). The push template `palmly://reading/{id}`
 * (`_shared/notif-templates.ts`) resolves here and forwards to the real reveal route so a
 * notification tap opens the reading instead of the "Unmatched Route" page.
 */
export default function ReadingRedirect() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <Redirect href={(id ? `/reveal?readingId=${id}` : '/') as Href} />;
}
