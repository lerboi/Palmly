# kb

Knowledge base: classical palmistry (手相) + physiognomy (面相) entries, keyed by `feature_key`
for deterministic lookup and grounded (RAG-lite) narrative generation. Built from **P5.T4**.

- Entertainment-appropriate, classically grounded. **No health/medical claims** (Backend §13).
- Versioned (`kb/v1/`, …); deploys stamp `kb_version`. Loaded into `kb_chunks` (pgvector).
- Native-reader / practitioner review happens in **P5.T5** → notes in `kb/REVIEW.md`.

See `Planning/Backend-specs.md` §6.5 and `Planning/mvp_spec.md` §5.3.
