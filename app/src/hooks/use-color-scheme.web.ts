import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const emptySubscribe = () => () => {};

/**
 * To support static rendering, the color scheme must be re-calculated on the client for web.
 * useSyncExternalStore returns the server snapshot (`false`) until hydration completes, then the
 * client snapshot (`true`) — detecting hydration without calling setState inside an effect
 * (react-hooks/set-state-in-effect).
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : 'light';
}
