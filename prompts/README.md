# prompts

Versioned AI prompt artifacts (system instructions, rubrics, few-shot anchors, JSON schemas).
Built from **P5**. Semver-stamped; deploys record `prompt_version`. **Never mutate in place** —
bump the version dir (Backend §6.6.7, §12).

Planned layout:

```
prompts/
  extraction/v1/     # Pass-1 vision extraction (image → structured features)
  narrative/v1/      # Pass-2 narrative (features + KB → reading, no image)
  compat/v1/         # compatibility narrative
  chat/v1/           # grounded chat
  schemas/           # palm_features.v1.json, face_features.v1.json (enum-heavy, Backend §6.2)
```
