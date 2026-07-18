import { useRouter, type Href } from 'expo-router';
import { PairRevealView, type PairData } from '@/features/reading/PairRevealView';
import { PREVIEW_GEOMETRY } from '@/features/reading/reveal';

/**
 * Compatibility pair-reveal (UIUX §2.7.4 / §2.10, redesign R16d). Renders {@link PairRevealView}
 * seeded with a representative match so it is buildable + device-free-verifiable. The live route
 * loads the real compatibility row on invite-accept.
 */
const PAIR: PairData = {
  partnerName: 'Mei',
  score: 82,
  headline: 'A rare, easy resonance — you steady each other.',
  subScores: [
    { label: 'Emotion', value: 88 },
    { label: 'Mind', value: 74 },
    { label: 'Energy', value: 91 },
    { label: 'Destiny', value: 79 },
    { label: 'Elements', value: 85 },
  ],
  click:
    'Both of your heart lines run deep and steady — you love the same way, slowly and for keeps. Where one of you hesitates, the other holds the thread.',
  stretch:
    'Your head lines pull in different directions: you reason in images, Mei in lists. Name the difference out loud and it becomes range, not friction.',
};

export default function Pair() {
  const router = useRouter();
  return (
    <PairRevealView
      data={PAIR}
      geometry={PREVIEW_GEOMETRY}
      onBack={() => router.back()}
      onFullReading={() => router.push('/reveal')}
      onShare={() => router.push('/share?initialVariant=compat' as Href)}
    />
  );
}
