-- Migration 0001 — core schema (Backend spec §3.2).
-- All tables in public; RLS is enabled + policied in migration 0002. Timestamps timestamptz;
-- ids uuid default gen_random_uuid() (core in PG13+). pgvector for kb embeddings.
create extension if not exists vector with schema extensions;

-- ============ Identity ============
-- auth.users is Supabase-managed. Anonymous-first: signInAnonymously() creates a real
-- auth.users row; later linkIdentity()/updateUser() upgrades it IN PLACE, so the uuid —
-- and every row below — carries over with zero migration.
create table profiles (
  id              uuid primary key references auth.users on delete cascade,
  display_name    text,
  avatar_url      text,
  locale          text not null default 'en',
  timezone        text not null default 'Asia/Singapore',
  birth_date      date,          -- optional; BaZi-lite day pillar for fortunes
  dominant_hand   text check (dominant_hand in ('left','right')),
  element_profile jsonb,         -- derived Five-Element summary (fortune bucketing)
  is_anonymous    boolean not null default true,  -- mirrored from JWT at write time
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============ Scans & features (the consistency core) ============
create table scans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles on delete cascade,
  kind           text not null check (kind in ('palm','face')),
  side           text check (side in ('left','right')),  -- palm only
  status         text not null default 'uploaded' check (status in
                   ('uploaded','queued','extracting','matched','narrating','complete','failed')),
  storage_path   text,             -- normalized crop in private bucket; nulled on deletion
  image_deleted_at timestamptz,    -- D2 retention audit
  capture_meta   jsonb not null default '{}',  -- device, landmark quality, lighting score,
                                               -- plugin+model versions (debug + consistency audit)
  failure_reason text,
  created_at     timestamptz not null default now()
);
create index on scans (user_id, created_at desc);

-- Deterministic structured features extracted from a scan (pass 1 output).
create table feature_sets (
  id                     uuid primary key default gen_random_uuid(),
  scan_id                uuid not null references scans on delete cascade,
  user_id                uuid not null references profiles on delete cascade,
  kind                   text not null check (kind in ('palm','face')),
  side                   text,
  features               jsonb not null,     -- enum-bucketed, schema-validated (see §6.3)
  feature_schema_version int  not null,
  extractor_version      text not null,      -- cv-pipeline + model + prompt version tuple
  geometry               jsonb not null,     -- normalized landmark ratios for identity matching
  feature_hash           text not null,      -- sha256 of canonicalized features JSON
  extraction_confidence  numeric,
  created_at             timestamptz not null default now()
);
create index on feature_sets (user_id, kind, side);

-- One canonical identity per (user, hand-or-face). THIS is what makes repeat scans
-- consistent: new scans are matched against it and REUSE its features.
create table subject_profiles (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references profiles on delete cascade,
  kind                     text not null check (kind in ('palm_left','palm_right','face')),
  canonical_feature_set_id uuid not null references feature_sets,
  scan_count               int not null default 1,
  last_matched_at          timestamptz,
  unique (user_id, kind)
);

-- ============ Readings ============
create table readings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles on delete cascade,
  feature_set_id  uuid not null references feature_sets,
  kind            text not null check (kind in ('palm','face','combined')),
  narrative       jsonb not null,   -- structured sections {title, body, tags[]} per section
  depth_level     int not null default 1,     -- progressive unlock (1=free tier)
  model_id        text not null,
  prompt_version  text not null,
  kb_version      text not null,
  tokens_in       int, tokens_out int,        -- cost telemetry
  created_at      timestamptz not null default now()
);
create index on readings (user_id, created_at desc);

-- ============ Compatibility (canonical pair ordering) ============
create table compatibility_pairs (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references profiles on delete cascade,
  user_b     uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),          -- canonical ordering: race-proof uniqueness
  unique (user_a, user_b)
);
create index on compatibility_pairs (user_a);
create index on compatibility_pairs (user_b);   -- index both sides for "my pairs" queries

create table compatibility_results (
  id                uuid primary key default gen_random_uuid(),
  pair_id           uuid not null references compatibility_pairs on delete cascade,
  status            text not null default 'pending' check (status in
                      ('pending','awaiting_b','computing','complete','failed')),
  score             int check (score between 0 and 100),
  sub_scores        jsonb,          -- {emotion, mind, life_energy, destiny, elements} 0–100 each
  narrative         jsonb,          -- structured sections, both-perspectives
  algorithm_version text not null,  -- deterministic scorer version (§7)
  model_id          text, prompt_version text, kb_version text,
  feature_set_a     uuid references feature_sets,   -- pinned inputs → reproducible
  feature_set_b     uuid references feature_sets,
  created_at        timestamptz not null default now()
);

-- ============ Invites (the viral loop's spine) ============
create table invites (
  id           uuid primary key default gen_random_uuid(),
  inviter_id   uuid not null references profiles on delete cascade,
  invitee_id   uuid references profiles,           -- filled on acceptance
  token_hash   text not null unique,               -- sha256; raw token only in the link
  kind         text not null default 'compatibility' check (kind in ('compatibility','generic')),
  context      jsonb not null default '{}',        -- {reading_id, card_variant, inviter_name}
  status       text not null default 'created' check (status in
                 ('created','clicked','installed','accepted','expired','revoked')),
  channel      text,                               -- whatsapp | line | zalo | wechat | copy | qr...
  clicked_at   timestamptz, installed_at timestamptz, accepted_at timestamptz,
  expires_at   timestamptz not null default now() + interval '30 days',
  created_at   timestamptz not null default now()
);
create index on invites (inviter_id, created_at desc);

-- ============ Subscriptions (RevenueCat mirror) ============
create table subscriptions (
  user_id          uuid primary key references profiles on delete cascade,
  rc_app_user_id   text not null,
  entitlements     jsonb not null default '{}',  -- {"premium": {"expires_at":..., "product_id":..., "store":...}}
  status           text,                          -- active | in_grace | billing_issue | expired
  latest_event_at  timestamptz,
  updated_at       timestamptz not null default now()
);
create table subscription_events (   -- raw webhook audit log (idempotency + debugging)
  id          uuid primary key default gen_random_uuid(),
  rc_event_id text unique,           -- idempotency key
  user_id     uuid,
  type        text,
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

-- ============ Daily fortunes (retention layer) ============
-- Fortunes are generated per (date × pillar_bucket × locale), NOT per user.
create table fortune_templates (
  fortune_date   date not null,
  pillar_bucket  text not null,     -- user's element_profile → bucket, computed deterministically
  locale         text not null,
  content        jsonb not null,    -- {overall, career, love, wealth, do[], dont[],
                                    --  lucky_direction, lucky_color, lucky_hours}
  model_id text, prompt_version text,
  primary key (fortune_date, pillar_bucket, locale)
);
create table user_fortunes (         -- read receipts / streaks / notification targeting
  user_id      uuid not null references profiles on delete cascade,
  fortune_date date not null,
  pillar_bucket text not null,
  opened_at    timestamptz,
  primary key (user_id, fortune_date)
);

-- ============ Chat (premium) ============
create table chat_threads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles on delete cascade,
  reading_id uuid references readings,
  created_at timestamptz not null default now()
);
create table chat_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references chat_threads on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  tokens_in  int, tokens_out int,
  created_at timestamptz not null default now()
);
create index on chat_messages (thread_id, created_at);

-- ============ Share cards ============
create table share_cards (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles on delete cascade,
  source_type   text not null check (source_type in ('reading','compatibility','fortune')),
  source_id     uuid not null,
  variant       text not null,      -- feed_4x5 | story_9x16
  locale        text not null,
  storage_path  text not null,      -- public-read bucket behind CDN, immutable cache headers
  created_at    timestamptz not null default now()
);

-- ============ Devices / push ============
create table devices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles on delete cascade,
  expo_push_token text unique,
  platform        text check (platform in ('ios','android')),
  locale          text, timezone text,
  notif_prefs     jsonb not null default '{"daily_fortune": true, "social": true}',
  last_seen_at    timestamptz not null default now()
);

-- ============ RAG knowledge base (§6.5) ============
create table kb_chunks (
  id          uuid primary key default gen_random_uuid(),
  kb_version  text not null,
  tradition   text not null check (tradition in ('palmistry','physiognomy','almanac')),
  feature_key text not null,        -- e.g. 'heart_line.deep_long' — deterministic lookup key
  content     text not null,
  embedding   extensions.vector(1024),  -- pgvector; embeddings for fuzzy retrieval in chat
  created_at  timestamptz not null default now()
);
create index on kb_chunks (kb_version, tradition, feature_key);

-- ============ Deletion / compliance audit ============
create table deletion_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, scope text,          -- 'images' | 'account' | 'scan:{id}'
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);
