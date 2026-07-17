-- H8 (ledger B7) — share cards are published publicly before any user share intent.
--
-- worker-narrative pre-renders a card for EVERY completed reading, and render.ts uploaded it
-- straight to the **public** `cards` bucket (with display-name attribution) at a guessable path.
-- Spec §13/§9: the public bucket holds only *user-initiated* share cards. Nothing about a reading
-- existing means its owner chose to publish their palm reading and their display name to a CDN.
--
-- Fix (Decision Log D-11, user's call): keep the pre-render — sharing must stay instant, that is the
-- whole point of it — but write it to a PRIVATE bucket and copy it into the public one only on share
-- intent. Same privacy outcome as render-on-share, without paying resvg cold start at the exact
-- moment the P2 viral share is happening.

-- ── The private staging bucket for pre-rendered, not-yet-shared cards ─────────────────────────────
insert into storage.buckets (id, name, public)
values ('card-drafts', 'card-drafts', false)
on conflict (id) do nothing;

-- Owner-only read, keyed on the leading path segment (same convention + idiom as `scans`, 0003:14-17
-- — object `name` excludes the bucket prefix, so the owner is foldername(name)[1]). Writes are
-- service_role only (card-render, BYPASSRLS) — no client insert/update policy, exactly like `cards`.
-- Owner-read exists so the app can preview its own card before sharing without publishing it first.
create policy "card_drafts_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'card-drafts' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ── Drop the bucket-listing policy on the public bucket ──────────────────────────────────────────
-- The advisors flag `cards_public_read` (0003:31-33: `for select to anon, authenticated using
-- (bucket_id = 'cards')`) as letting any client LIST every object in the bucket — i.e. enumerate
-- every published card of every user. A public bucket does NOT need this: the public CDN endpoint
-- serves object URLs without consulting RLS, which is exactly what invite-page's OG image and the
-- share sheet rely on. Removing it kills enumeration while leaving URL fetches untouched.
drop policy if exists "cards_public_read" on storage.objects;

-- ── Track publication so the app/back end can tell a draft from a shared card ────────────────────
-- Additive + backfilled: every card that exists today was already published under the old behaviour,
-- so stamping them preserves the truth rather than retroactively calling them drafts.
alter table public.share_cards add column if not exists published_at timestamptz;
update public.share_cards set published_at = created_at where published_at is null;

-- One card row per (user, source, variant): render.ts now upserts on this key so a re-render
-- refreshes the existing card instead of accumulating duplicate rows — and, critically, cannot
-- silently un-publish a card the user already shared. Safe to add: share_cards is empty on staging
-- (0 rows, 0 duplicate groups, verified before writing this).
create unique index if not exists share_cards_user_id_source_id_variant_key
  on public.share_cards (user_id, source_id, variant);

comment on column public.share_cards.published_at is
  'When the user actually shared this card and it was copied into the public `cards` bucket. NULL = '
  'a pre-rendered draft living only in the private `card-drafts` bucket (audit H8). storage_path is '
  'the object path within whichever bucket currently holds it.';
