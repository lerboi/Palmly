import { router, type Href } from 'expo-router';
import { CaptureView } from '@/features/capture/CaptureView';

/**
 * Capture C — face-reading variant (UIUX §2.3, redesign R13). Oval guide + alignment prompts.
 * Shown in the "searching → line up" state. Live camera + Euler-angle prompts are device-only
 * ([~]); the shutter advances to analyzing for the flow walk-through.
 */
export default function FaceCapture() {
  return (
    <CaptureView
      mode="face"
      state="searching"
      instruction="Center your face in the oval"
      onShutter={() => router.push('/analyzing' as Href)}
    />
  );
}
