import { useCallback, useState } from 'react';
import { type Hand, type ScanKind } from '@/lib/scan';
import { type CaptureState } from './capture';
import { type GuidedCapture } from './guidedCapture';
import { useScanUpload } from './useScanUpload';

/**
 * Web/SSG stub of the P4.T2 guided-capture engine (`useGuidedCapture.native.tsx` is the real
 * one — Metro resolves `.native` on device). Exists because react-native-vision-camera
 * initializes Nitro objects at import time and would crash the static web export (the
 * device-free screenshot-verify path). Keeps the Phase-1 stand-in walk: fake shutter → freeze →
 * review; confirm falls back to the library picker so it never routes to /analyzing without a
 * scanId (audit A5).
 */
export function useGuidedCapture({ kind, hand }: { kind: ScanKind; hand?: Hand }): GuidedCapture {
  const { pickAndUpload, uploading, error: uploadError, hasCompleted } = useScanUpload({ kind, hand });
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
    uploading,
    displayError: uploadError,
    retryPermission: () => {},
    pickAndUpload,
  };
}
