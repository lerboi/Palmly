import { FortuneHome } from '@/features/fortune/FortuneHome';

/** /dev preview — Today when the fortune fetch failed (Audit-4 SH-1). Not shipped in production. */
export default function FortuneErrorPreview() {
  return <FortuneHome fortune={null} premium={false} error onRetry={() => {}} />;
}
