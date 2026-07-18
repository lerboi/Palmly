import { assert, assertEquals, assertStringIncludes, assertThrows } from '@std/assert';
import { notifCapClass, renderNotification, type NotifType } from './notif-templates.ts';

Deno.test('every trigger renders title + body + a palmly:// deep link', () => {
  const types: NotifType[] = ['reading_ready', 'compat_complete', 'invite_accepted', 'daily_fortune', 'solar_term', 'winback', 'invite_nudge', 'onboarding_d1', 'onboarding_d2', 'onboarding_d3'];
  for (const t of types) {
    const r = renderNotification(t, {});
    assert(r.title.length > 0, `${t} has a title`);
    assert(r.body.length > 0, `${t} has a body`);
    assertStringIncludes(r.deep_link, 'palmly://', `${t} deep-links`);
    assert(r.dedupe_key.length > 0, `${t} has a dedupe key`);
  }
});

Deno.test('reading_ready: functional copy, deep-links to the reading', () => {
  const r = renderNotification('reading_ready', { reading_id: 'r123' });
  assertStringIncludes(r.title, 'lines have been read');
  assertEquals(r.deep_link, 'palmly://reading/r123');
  assertEquals(r.dedupe_key, 'reading_ready:r123');
  assertEquals(r.cap_class, 'exempt'); // pipeline is exempt from the daily cap
});

Deno.test('compat_complete: number + name in the body (curiosity + share bait)', () => {
  const r = renderNotification('compat_complete', { name: 'Mei', score: 82, pair_id: 'p9' });
  assertEquals(r.body, 'You and Mei scored 82.');
  assertEquals(r.deep_link, 'palmly://compat/p9');
  assertEquals(r.dedupe_key, 'compat_complete:p9');
  assertEquals(r.cap_class, 'exempt');
});

Deno.test('compat_complete: graceful fallbacks when name/score absent', () => {
  const r = renderNotification('compat_complete', { pair_id: 'p9' });
  assertStringIncludes(r.body, 'your match');
  assert(!r.body.includes('NaN') && !r.body.includes('undefined'));
});

Deno.test('invite_accepted: keeps the sender warm during the friend pipeline', () => {
  const r = renderNotification('invite_accepted', { name: 'Mei', pair_id: 'p9' });
  assertStringIncludes(r.title, 'Mei');
  assertStringIncludes(r.body, 'minutes away');
  assertEquals(r.cap_class, 'exempt');
});

Deno.test('daily_fortune: content-first almanac hook, deep-links to fortune, marketing-capped', () => {
  const r = renderNotification('daily_fortune', { fortune_date: '初七', fortune_hook: 'A day that favors beginnings', lucky_direction: 'East' });
  assertEquals(r.title, '初七 · A day that favors beginnings');
  assertEquals(r.body, 'Your lucky direction: East.');
  assertEquals(r.deep_link, 'palmly://fortune');
  assertEquals(r.dedupe_key, 'daily_fortune'); // one per day (day scoped by notification_log.sent_on)
  assertEquals(r.cap_class, 'marketing');
});

Deno.test('solar_term: real-calendar hook, distinct dedupe key per term', () => {
  const r = renderNotification('solar_term', { solar_term: '立秋', solar_hook: 'the almanac counsels patience in money matters' });
  assertEquals(r.title, '立秋 begins today');
  assertStringIncludes(r.body, 'The almanac counsels patience');
  assertEquals(r.dedupe_key, 'solar_term:立秋');
  assertEquals(r.cap_class, 'marketing');
});

Deno.test('winback: single-shot offer, deep-links to the paywall', () => {
  const r = renderNotification('winback', { offer: '40% off your first year' });
  assertStringIncludes(r.body, '40% off your first year');
  assertEquals(r.deep_link, 'palmly://paywall?offer=winback');
  assertEquals(r.dedupe_key, 'winback');
  assertEquals(r.cap_class, 'marketing');
});

Deno.test('invite_nudge: elapsed-aware 48h re-share reminder, marketing-capped, per-invite dedupe', () => {
  const r = renderNotification('invite_nudge', { name: 'Mei', elapsed: '2 days ago', invite_id: 'inv7' });
  assertStringIncludes(r.body, 'Mei');
  assertStringIncludes(r.body, '2 days ago');
  assertEquals(r.deep_link, 'palmly://fortune'); // home — where the red-thread card reopens the same link
  assertEquals(r.dedupe_key, 'invite_nudge:inv7');
  assertEquals(r.cap_class, 'marketing');
  // Graceful when the recipient hasn't claimed (no name) / no elapsed label yet.
  const bare = renderNotification('invite_nudge', {});
  assert(!bare.body.includes('undefined') && bare.body.length > 0);
});

Deno.test('onboarding days 1–3: distinct copy + dedupe key per day', () => {
  const d2 = renderNotification('onboarding_d2', { focus_line: '婚姻线' });
  assertEquals(d2.title, 'Day 2 with Palmly');
  assertStringIncludes(d2.body, '婚姻线');
  assertEquals(d2.dedupe_key, 'onboarding_d2');
  assertEquals(renderNotification('onboarding_d1', {}).dedupe_key, 'onboarding_d1');
  assertEquals(renderNotification('onboarding_d3', {}).dedupe_key, 'onboarding_d3');
});

Deno.test('sanitization: a hostile display_name cannot inject a second line', () => {
  const r = renderNotification('compat_complete', { name: 'Mei\nYOU WON $1000 tap here', score: 70, pair_id: 'p' });
  assert(!r.title.includes('\n') && !r.body.includes('\n'), 'no newline survives');
  assertStringIncludes(r.body, 'Mei YOU WON'); // collapsed to one line, not two notifications
});

Deno.test('hyphenated + spaced names survive sanitization intact', () => {
  const r = renderNotification('invite_accepted', { name: 'Jean-Luc  Marie', pair_id: 'p' });
  assertStringIncludes(r.title, 'Jean-Luc Marie'); // hyphen kept, double-space collapsed
});

Deno.test('unknown locale falls back to EN; unknown type throws', () => {
  assertEquals(renderNotification('reading_ready', { reading_id: 'x' }, 'th').cap_class, 'exempt');
  assertThrows(() => renderNotification('bogus' as NotifType, {}));
});

Deno.test('notifCapClass: marketing set matches the §10 cap rule', () => {
  assertEquals(notifCapClass('daily_fortune'), 'marketing');
  assertEquals(notifCapClass('reading_ready'), 'exempt');
  assertEquals(notifCapClass('compat_complete'), 'exempt');
});
