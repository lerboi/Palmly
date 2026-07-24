import { Screen, Text } from '@/components/ui';

/** Web/SSG stub — the P4.T3 canonicalization pipeline is Android-native (see `.native.tsx`). */
export function CanonicalBench() {
  return (
    <Screen>
      <Text variant="title">Canonical crop bench</Text>
      <Text tone="secondary">Device-only: the cv1 crop/warp runs in the palm-landmarks native module.</Text>
    </Screen>
  );
}
