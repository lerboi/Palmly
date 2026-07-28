# Palmly — Claude Code project guide

**Build ledger (single source of truth):** `Planning/MVP_Buildplan.md` — a checkbox task
machine (phases P0–P12) with a STATE block + Execution Protocol. Specs it draws from:
`Planning/mvp_spec.md`, `Planning/Backend-specs.md`, `Planning/UIUX/UIUX-specs.md` (UIUX docs
live under `Planning/UIUX/`). Env/secret map: `docs/ENVIRONMENT.md`. Audit fix ledgers:
`Planning/Audits/Audit-1-Backend/` (done) and `Planning/Audits/Audit-2-Frontend/`
(`Frontend-audit.md` + `Frontend-audit-Tasks.md`, loop prompt in `Prompt.txt`).

## Supabase: use the MCP server to read DB details

A **read-only** Supabase MCP server is configured for this project (`.mcp.json`), connected to
the **staging** project (`rphtdgoggsldshtdbkaj`). **To inspect anything about the Supabase
backend — schema, tables, RLS, storage, migrations, extensions, Edge Functions, logs, config —
use the `mcp__supabase__*` tools instead of guessing or asking the user.** (If the tools are
deferred, load them first with `ToolSearch`.)

Common read tools:
- `mcp__supabase__list_tables` — tables + columns
- `mcp__supabase__execute_sql` — run read-only SQL
- `mcp__supabase__list_migrations` — applied migrations
- `mcp__supabase__list_extensions` — installed extensions (pgmq, pgvector, pg_cron, …)
- `mcp__supabase__list_storage_buckets` / `mcp__supabase__get_storage_config` — storage
- `mcp__supabase__list_edge_functions` / `mcp__supabase__get_edge_function` — Edge Functions
- `mcp__supabase__get_logs` then `mcp__supabase__get_advisors` — start here when debugging;
  advisors surface security/perf issues
- `mcp__supabase__get_project_url` / `mcp__supabase__get_publishable_keys` — client config values
- `mcp__supabase__generate_typescript_types` — DB TypeScript types
- `mcp__supabase__search_docs` — Supabase documentation

### Guardrails
- **Single Supabase project (2026-07-14): `palmly-staging` (`rphtdgoggsldshtdbkaj`) is the ONE
  working DB pre-launch; `palmly-prod` was deleted and is recreated at launch (P12) from the git
  migrations.** Do all Supabase config once, on this project. (Decision Log 2026-07-14.)
- The MCP is **read-only** and targets **staging** — treat it as an inspection window, not a way
  to change anything.
- **Schema changes never go through the MCP.** Every schema change is a new versioned migration
  file in `supabase/migrations/` (Build Plan standing rule + Backend spec), and must be
  **backward-compatible / expand-contract** (additive; never a breaking drop/rename in one step).
  Local dev uses `supabase start`; deploys run migrations via the Supabase CLI.
- Don't paste secrets into queries or output. Secret keys live only in the root `.env`
  (git-ignored), never in the client bundle. **Consolidated 2026-07-29:** `.env.staging` and
  `.env.prod` are gone — one `.env` holds everything, and the `SUPABASE_STAGING_*` key names are
  what now say which project is being addressed.
