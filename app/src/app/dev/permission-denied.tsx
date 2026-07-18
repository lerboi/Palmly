import { router, type Href } from 'expo-router';
import { CameraDeniedView } from '@/features/capture/CameraDeniedView';

/** Dev preview of the camera-permission DENIED recovery (F1.3) — the live trigger is device-only. */
export default function DevPermissionDenied() {
  return <CameraDeniedView onUploadInstead={() => router.replace('/primer' as Href)} onBack={() => router.back()} />;
}
