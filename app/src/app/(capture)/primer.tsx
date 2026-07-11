import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function Primer() {
  return (
    <PlaceholderScreen
      group="(capture)"
      title="Palmly needs your camera"
      note="B · camera primer + consent surface (UIUX §2.2, Backend §9)"
      links={[
        { href: '/palm', label: 'Allow camera → palm capture' },
        { href: '/reveal', label: 'Upload a photo instead (skip to reveal)' },
      ]}
    />
  );
}
