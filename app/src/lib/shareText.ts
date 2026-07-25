/**
 * Share-message composition (UIUX §2.6) — pure, with no `supabase`/AsyncStorage imports, so it
 * unit-tests without dragging the client SDK's native modules into jest (same discipline as
 * `compatCopy.ts`). The copy is lightly tuned per channel: visual-first platforms (Instagram,
 * TikTok) get a short caption + link; messaging apps (WhatsApp, LINE, Zalo) and the generic OS
 * sheet get the explicit "compare palms" invite. The essence alone is returned when no link exists.
 */
export function composeShareText(headline: string, url?: string, channel?: string): string {
  const lead = `Palmly read my palm — ${headline}`;
  if (!url) return lead;
  // Instagram/TikTok are caption-driven and visual — a terse hook reads better than a full sentence.
  const visual = channel === 'instagram' || channel === 'tiktok';
  // No emoji in outbound copy — the icon module's own no-emoji rule applies to the text we put in
  // someone else's feed too (Audit-4 CO-8).
  return visual ? `${lead}\nTry yours & compare palms:\n${url}` : `${lead}\nSee what yours says & compare palms: ${url}`;
}
