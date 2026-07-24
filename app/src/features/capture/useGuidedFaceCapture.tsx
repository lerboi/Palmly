import { useCallback, useState } from 'react';
import { type CaptureState } from './capture';
import { type GuidedCapture } from './guidedCapture';
import { useScanUpload } from './useScanUpload';

/**
 * Web/SSG stub of the P4.T5 guided face-capture engine (`useGuidedFaceCapture.native.tsx` is the
 * real one). Same reason as the palm split: the camera/nitro imports initialize native objects
 * at import time and would crash the static web export. Confirm falls back to the library pick
 * so it never routes to /analyzing without a scanId (audit A5).
 */
export function useGuidedFaceCapture(): GuidedCapture {
  const { pickAndUpload, uploading, error: uploadError, hasCompleted } = useScanUpload({ kind: 'face' });
  void hasCompleted;
  const [state, setState] = useState<CaptureState>('ready');

  const onShutter = useCallback(() => {
    setState('captured');
    setTimeout(() => setState('review'), 500);
  }, []);

  return {
    gate: 'standin',
    state,
    feed: undefined,
    capturedUri: null,
    landmarks: undefined,
    torchOn: false,
    toggleTorch: () => {},
    onShutter,
    onRetake: () => setState('ready'),
    onConfirm: () => void pickAndUpload(),
    autoAdvancing: false,
    uploading,
    displayError: uploadError,
    retryPermission: () => {},
    pickAndUpload,
  };
}
