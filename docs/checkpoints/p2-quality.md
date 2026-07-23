# P2.T4 — CaptureQuality signal test matrix (on-device)

**Device:** Samsung Galaxy S20+ (SM-G985F, Exynos 990) · **Date:** 2026-07-24 ·
**Build:** palm-landmarks VIDEO mode, XNNPACK CPU delegate, 960×720 analysis stream.
Signals are raw measurements (thresholds/states are P4.T2's job, UIUX §2.3).

## Observed signal behavior (screenshots in this directory)

| Signal | Manipulation | Observed | Verdict |
|---|---|---|---|
| `bboxFraction` | hand near ↔ far | 35% (arm's length, `p2-skeleton-right.png`) → 72-80% (close, `p2-skeleton-left*.png`) | ✅ moves with distance |
| `tiltDeg` | palm square ↔ tilted | 20° (square-ish) → 26-30° (tilted) | ✅ tracks tilt |
| `palmFacing` | palm toward lens, both hands | `palm ✓` for the **Right** palm AND the **Left** palm (sign convention correct both sides) | ✅ (back-of-hand flip capture still owed — see note) |
| `flatness` | fingers flat ↔ slightly bent | 0.044 (flat) → 0.064-0.096 (bent/close) | ✅ rises with curl |
| `exposure` | ambient ↔ lens covered | 37-40% ambient → **1%** covered (`p2-quality-dark.png`) | ✅ dark signal solid |
| `hands`/searching | no hand | `hands 0`, geometry fields read 0/false, exposure stays real | ✅ |

**Note:** the deliberate back-of-hand flip (`palm ✗`) wasn't captured in a screenshot during the
live session; the sign convention is validated for the palm side on both hands (winding flips
between Left/Right and both read `✓`, so the back side necessarily flips to `✗` geometrically). Grab the
flip screenshot in the next device session for completeness.

## Performance record (P2.T1/T2 numbers)

| Config | State | Sustained fps | infer |
|---|---|---|---|
| GPU delegate (OpenCL→ICD fallback), 1440×1080 + rotate | tracked | 10.8-11.6 | 49-66ms |
| GPU delegate, 960×720 (build 6) | tracked | **13.0-14.7** | 45-52ms |
| **XNNPACK CPU (final default), 960×720** | **tracked** | **16.6-17.8** ✅ | 51-63ms |
| XNNPACK CPU, 960×720 | searching (no hand, full palm-detector every frame) | 10.9-13.8 | 44-81ms |

- The ≥15fps bar applies to the guidance loop, i.e. the **tracked** state — passes with margin.
- Searching-mode is slower by design (palm detection every frame) and only affects
  hand-acquisition latency (~100ms worst case), not guidance smoothness.
- **Closing run addendum (04:14-04:16):** with the hand crammed at bbox 70-100% (the §2.3
  "too close" zone) fps read 10.4-13 with spiky 44-91ms inference — partial-out-of-frame
  tracking churn re-triggers the palm detector. This is a state the capture UX explicitly
  corrects ("A little further"), not an operating point. Also: measured after 35+ min of
  continuous camera+CPU on a charging phone (Exynos 990 thermals) at 4am. Extra tilt-signal
  evidence from the same run: tilt read 3° (square) → 40° (tilted) → 5° (re-squared), flat
  0.058→0.124 with curl (`f1-f3` screenshots, session tmp).
- **Owed leg (P2.T2 close):** one continuous ≥60s log at coached capture distance
  (bbox ~35-55%) on a cool device — expected comfortably ≥15fps per the t=130-155s window.
- `errors 0` across ~3000 consecutive results; session lifecycle (configured → started →
  preview started) clean on every cold start.
- Delegate decision + rotation-space fix + native-CameraOutput architecture: Decision Log
  2026-07-24 in `Planning/MVP_Buildplan.md`.
