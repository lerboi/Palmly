-- P9.T6 — pgvector KB retrieval for chat (Backend §6.5, §3.2). The narrative passes use
-- DETERMINISTIC keyed lookup (feature_key), but chat is free-form: a user question may not map to
-- any stored feature_key, so we add fuzzy similarity retrieval over kb_chunks.embedding. This is the
-- `hnsw` index the P3.T2 review deferred to P9, plus a `kb_search` RPC.
--
-- Retrieval stays grounded: chat combines this fuzzy leg with the reading's OWN feature_refs (the
-- cited lines), so answers are anchored to the user's actual features (§6.5) and fuzzy hits only
-- widen coverage.

-- Approximate-NN index for cosine similarity (pgvector). Only non-null embeddings are indexed;
-- until embeddings are populated (deploy job) retrieval simply returns nothing and chat falls back
-- to keyed grounding. For 141 chunks a seq scan is already instant; the index is the scale path.
create index if not exists kb_chunks_embedding_hnsw
  on public.kb_chunks using hnsw (embedding vector_cosine_ops);

-- Nearest KB chunks to a query embedding. `p_query` is a pgvector text literal ('[0.1,...]') so
-- PostgREST can pass it as a plain string; cast to vector(1024) inside. Reads only kb_chunks (not
-- user data, RLS-readable by authenticated), so security invoker is fine.
create or replace function public.kb_search(
  p_query      text,
  p_kb_version text default 'v1',
  p_tradition  text default null,
  p_k          int default 6
) returns table (feature_key text, tradition text, content text, distance real)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select feature_key, tradition, content, (embedding <=> p_query::vector(1024))::real as distance
  from public.kb_chunks
  where kb_version = p_kb_version
    and (p_tradition is null or tradition = p_tradition)
    and embedding is not null
  order by embedding <=> p_query::vector(1024)
  limit greatest(1, least(coalesce(p_k, 6), 20));
$$;

grant execute on function public.kb_search(text, text, text, int) to authenticated, service_role;
