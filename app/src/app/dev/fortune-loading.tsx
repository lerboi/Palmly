import { FortuneHome } from '@/features/fortune/FortuneHome';

/** /dev preview — Today while the fortune is in flight (Audit-4 SH-1). Not shipped in production. */
export default function FortuneLoadingPreview() {
  return <FortuneHome fortune={null} premium={false} loading />;
}
