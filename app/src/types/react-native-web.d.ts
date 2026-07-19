// react-native-web extends `Switch` with web-only color props that are absent from the React Native
// core `SwitchProps` type. Declared here (interface-merge) so `activeThumbColor` — added in F2.5 to
// kill the default teal web thumb (audit §5.7) — typechecks while remaining a no-op on native.
import 'react-native';

declare module 'react-native' {
  interface SwitchProps {
    /** react-native-web only: thumb color when the switch is ON (native uses `thumbColor` for both). */
    activeThumbColor?: string;
    /** react-native-web only: track color when the switch is ON. */
    activeTrackColor?: string;
  }
}
