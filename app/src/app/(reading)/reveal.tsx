import { RevealView } from '@/features/reading/RevealView';
import { PREVIEW_GEOMETRY, PREVIEW_READING } from '@/features/reading/reveal';

/**
 * Reading reveal (UIUX §2.5, P6.T3). Renders {@link RevealView}. For now it is seeded with a
 * representative reading so the screen is buildable + device-free-verifiable (web screenshot); once
 * capture (P4) runs on a real phone this loads the real `readings` row via the scan id.
 */
export default function Reveal() {
  return <RevealView reading={PREVIEW_READING} geometry={PREVIEW_GEOMETRY} />;
}
