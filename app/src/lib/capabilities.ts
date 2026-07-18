/**
 * Capability flags — build-time constants that gate features whose full path isn't shipped yet
 * (audit F1.6). Dependency-free by design so any surface can import a flag without pulling extra
 * modules into its unit tests.
 *
 * `FACE_READING_ENABLED` hides every face "door" (the reveal's FaceOfferCard, the history face
 * rows) so "Read my face" can't launch a flow whose reveal is still a palm layout. F1.T7 builds
 * the kind-aware face reveal content path and flips this to `true`.
 */
export const FACE_READING_ENABLED = false;
