# eval

Extraction evaluation harness (**P12.T1–T2**, the Backend D3 model gate).

- `eval/data/` — 30–50 consenting real palm photos + adversarial samples (blur, non-hand).
  **Stored outside git** (`.gitignore`d); only the consent-flagged manifest is committed here.
- Harness runs the set through `gemini-3.5-flash` vs `claude-sonnet-5`: per-field agreement,
  repeat-run stability (3× each), human-graded plausibility. Decision rule pre-registered in the
  harness README; result in `eval/REPORT.md`.

See `Planning/MVP_Buildplan.md` P12 and `Planning/Backend-specs.md` §6.4.
