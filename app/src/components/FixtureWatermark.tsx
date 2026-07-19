import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Non-prod honesty backstop (audit §6 — the "fixture-inversion" risk: a real user must never mistake
 * a PREVIEW_* fixture for their own data). A faint diagonal "SAMPLE DATA" watermark that marks any
 * fixture-rendered screen. `pointerEvents="none"` so it never blocks interaction.
 *
 * ON only when the build flag `EXPO_PUBLIC_FIXTURE_WATERMARK=1` is baked (`… npx expo export`, or an
 * EAS preview/dev profile). A production build leaves it unset → renders NOTHING, so the watermark can
 * never ship to a real user. (Deliberately NOT gated on `__DEV__`: it is unreliably `true` in a plain
 * `expo export` web bundle, which would leak the mark into what should read as a prod artifact — the
 * explicit env flag is the honest, verifiable non-prod signal.) Mounted on the `/dev` fixture routes'
 * layout; a QA/preview build bakes the flag to mark the whole app.
 */
export const FIXTURE_WATERMARK_ON = process.env.EXPO_PUBLIC_FIXTURE_WATERMARK === '1';

export function FixtureWatermark() {
  const theme = useTheme();
  if (!FIXTURE_WATERMARK_ON) return null;
  return (
    <View pointerEvents="none" style={styles.fill}>
      <View style={styles.rotate}>
        {[0, 1, 2].map((i) => (
          <Text
            key={i}
            variant="display"
            color={theme.colors.danger}
            style={[styles.label, { opacity: 0.09 }]}
          >
            SAMPLE DATA
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  rotate: { transform: [{ rotate: '-28deg' }], alignItems: 'center', gap: 64 },
  label: { fontSize: 34, letterSpacing: 4 },
});
