# supabase

Backend for Palmly (Postgres + Auth + Storage + Edge Functions + Queues + Realtime + pgvector).
Built out from **P3** onward. See `Planning/Backend-specs.md`.

| Dir | Contents |
|---|---|
| `migrations/` | Versioned SQL migrations. **Never edit an applied migration** — every schema change is a new file (0001 schema, 0002 RLS, …). |
| `functions/` | Edge Functions (`_shared/` lib + per-endpoint dirs: `worker-scan`, `worker-narrative`, `revenuecat-webhook`, `invite-create`, `card-render`, …). |
| `seed/` | Seed data / KB loaders for local + staging. |
| `tests/` | pgTAP suites (RLS proofs are the P3.T2 deliverable) + function tests. |

Local dev uses `supabase start` (Docker); staging/prod are the two cloud projects (P0.T2).
