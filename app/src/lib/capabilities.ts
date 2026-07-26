/**
 * Capability flags — build-time constants that gate features whose full path isn't shipped yet
 * (audit F1.6). Dependency-free by design so any surface can import a flag without pulling extra
 * modules into its unit tests.
 *
 * `FACE_READING_ENABLED` gates every face "door" (the reveal's FaceOfferCard, the history face
 * rows). F1.T6 shipped it `false` while "Read my face" led only to a palm layout; F1.T7 built the
 * kind-aware face reveal content path (`RevealView` face hero + physiognomy sections/footnotes) and
 * flipped it `true`. Left as a switch so the face surfaces can be cut fast if extraction (H4c)
 * regresses.
 */
export const FACE_READING_ENABLED = true;

/**
 * `PULSE_ENABLED` gates Today's Line and everything hanging off it — the hero card, the chapter
 * chip/sheet, the boundary banner, the milestone moment, and the check-in ritual's entry point
 * (Audit-5 · 03 §6, staged rollout §11).
 *
 * Off means Today renders exactly as it did before Audit-5: the almanac back at `md` elevation, the
 * week strip on its local history. That is the property that makes this a real switch rather than a
 * decoration — the rollout plan ships the schema and generation dark first (RF1), observes three
 * nightly runs, and only then flips this.
 */
export const PULSE_ENABLED = true;
