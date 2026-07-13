# kb

Knowledge base: classical palmistry (手相) + physiognomy (面相) entries, keyed by `feature_key`
for deterministic lookup and grounded (RAG-lite) narrative generation. Built in **P5.T4**.

- Entertainment-appropriate, classically grounded. **No health/medical/lifespan/financial claims**
  (Backend §13) — enforced by the banned-claims audit.
- Versioned (`v1/`, …); deploys stamp `kb_version`. Loaded into `kb_chunks` (pgvector).
- Native-reader / practitioner review happens in **P5.T5** → notes in `kb/REVIEW.md`.

See `Planning/Backend-specs.md` §6.5 and `Planning/mvp_spec.md` §5.3.

## Layout (v1)

```
v1/palmistry.json     94 chunks — one per (palm feature, enum-value)
v1/physiognomy.json   47 chunks — one per (face feature, enum-value)
audit.mjs             coverage + banned-claims audit (pure, schema-derived)
load.mjs              kbRows() / loadKbInto(client) — the byte-stable row builder
```

### `feature_key` convention

Atomic per-`(feature, enum-value)` keying — the narrative worker (P5.T6) looks up one chunk per
salient extracted value and composes them, so the **same features always retrieve the same
passages** (§6.5, the consistency lever). Dotted paths, e.g.:

- `hand_shape.fire`, `heart_line.depth.deep`, `fate_line.origin.wrist`, `mount.name.venus`,
  `mount.prominence.prominent`, `marking.star`
- `face_shape.wood`, `three_courts.balanced`, `eyes.shape.almond`, `nose.bridge.high`, `canthus_wolong.prominent`

The required key set is **derived from the schemas** (`schemas/*.v1.json`), not hand-listed — so a
new enum value can't silently escape coverage.

## Verify (P5.T4)

```
node kb/audit.mjs        # coverage 141/141 + banned-claims clean → P5T4_OK
node kb/audit.mjs --list # print the schema-derived required keys
cd supabase/tests && node --test   # kb.test.mjs proves load + keyed lookup vs staging (rolled back)
```

## Deploy (persistent load, when staging needs the real KB)

```
CONFIRM=1 node supabase/tests/scripts/load-kb.mjs   # idempotent per kb_version
```
