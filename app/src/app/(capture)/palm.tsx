import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function PalmCapture() {
  return (
    <PlaceholderScreen
      group="(capture)"
      title="Guided palm capture"
      note="C · §2.3 state machine, auto-capture (P2 native landmarks, P4 UI)"
      links={[{ href: '/analyzing', label: 'Captured → analyzing' }]}
    />
  );
}
