import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function FaceCapture() {
  return (
    <PlaceholderScreen
      group="(capture)"
      title="Face capture"
      note="Face-reading variant · oval guide + Euler-angle prompts (UIUX §2.3, P4.T5)"
      links={[{ href: '/analyzing', label: 'Captured → analyzing' }]}
    />
  );
}
