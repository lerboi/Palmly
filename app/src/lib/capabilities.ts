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
