import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useTheme } from '@/theme';

/**
 * The ONE sanctioned glass surface in the app (Audit-5 · 02 §1.2).
 *
 * The locked design system contains zero blur on purpose: warm paper and hairlines, not
 * translucency. Scattering glass over rice-paper cards would be drift, and would cost the identity.
 * But the check-in ritual renders copy over a LIVE CAMERA FEED, and translucency is the honest
 * material there — the plate is over the feed, so it should read as being over the feed. Apple uses
 * it the same way, for the same reason.
 *
 * A real blur is a device-only enhancement behind a capability check; everywhere else this is an
 * opaque scrim-tinted plate, which is a perfectly good plate. That ordering matters: the fallback
 * is the universal case and it is designed first, so the feature never depends on the enhancement.
 */
export function GlassPlate({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  const shape: ViewStyle = {
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    overflow: 'hidden',
  };

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" style={[shape, style]}>
        {children}
      </GlassView>
    );
  }

  // The universal fallback: the theme's own scrim, which is already tuned per scheme, plus a
  // hairline so the plate keeps an edge against a bright or busy camera frame.
  return (
    <View
      style={[
        shape,
        {
          backgroundColor: theme.colors.scrim,
          borderWidth: theme.strokes.hairline,
          borderColor: 'rgba(255,255,255,0.18)',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
