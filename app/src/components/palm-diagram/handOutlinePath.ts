// A clean, anatomically-credible open-palm OUTLINE (right hand, palm to camera, thumb on the left),
// authored as a single closed path in the shared 0–1000 frame. Unlike the procedural
// `handSilhouette()` (which derives a containing blob from the user's own line points so real
// creases can never overshoot it), this is a FIXED, hand-tuned illustration used purely as brand
// imagery — the onboarding heroes (welcome / hand-select / primer) and the guided-capture guide
// (UIUX §2.2–2.3, redesign "premium outline" direction). No React/RN imports so it stays
// unit-testable and importable by both the app component and the capture overlay.

/** The open-palm outline, 0–1000 frame. Mirror horizontally (`scale(-1,1)`) for the left hand. */
export const HAND_OUTLINE_PATH =
  'M 336 792 ' +
  'C 322 726 318 664 308 602 ' +
  'C 300 552 262 526 210 482 ' +
  'C 182 458 158 438 156 408 ' +
  'C 154 376 182 360 214 374 ' +
  'C 256 392 288 430 314 470 ' +
  'C 324 442 330 416 346 402 ' +
  'C 352 306 352 224 356 152 ' +
  'C 358 116 396 116 400 152 ' +
  'C 404 240 404 318 410 386 ' +
  'C 430 372 452 372 466 386 ' +
  'C 470 282 470 178 470 100 ' +
  'C 472 64 510 64 512 100 ' +
  'C 514 192 514 300 520 390 ' +
  'C 540 376 562 376 576 390 ' +
  'C 582 300 584 214 590 154 ' +
  'C 592 120 628 120 632 154 ' +
  'C 636 242 636 330 644 398 ' +
  'C 660 386 680 388 694 406 ' +
  'C 702 342 708 286 714 248 ' +
  'C 716 214 750 216 752 250 ' +
  'C 756 340 750 430 736 508 ' +
  'C 748 586 748 662 724 726 ' +
  'C 702 784 636 806 512 806 ' +
  'C 430 806 372 800 336 792 Z';

/** The heart line, drawn inside the outline as the single accent hint (0–1000 frame). Sampled
 *  points → smoothed via `smoothPath` at the call site, so it matches the engraved-crease curve. */
export const HAND_OUTLINE_HEART: [number, number][] = [
  [352, 470],
  [470, 432],
  [600, 428],
  [694, 452],
];
