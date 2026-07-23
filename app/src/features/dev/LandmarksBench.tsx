import { StyleSheet, Text, View } from 'react-native';

/**
 * Web/SSG stub of the P2 bench (`LandmarksBench.native.tsx` is the real one). Exists because the
 * bench imports react-native-vision-camera + the face detector, whose modules initialize Nitro
 * objects at import time and would crash the static web export.
 */
export function LandmarksBench() {
  return (
    <View style={styles.center}>
      <Text style={styles.note}>The P2 spike bench is device-only — open this on Android.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  note: { fontSize: 16, textAlign: 'center' },
});
