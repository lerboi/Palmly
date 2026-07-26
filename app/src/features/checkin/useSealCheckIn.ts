import type { ReactNode } from 'react';
import type { StoredHandSignature } from '@/lib/readings';

/**
 * The check-in engine contract, and its WEB STUB (Audit-5 · 03 §6).
 *
 * The platform split exists for the same reason the capture engine's does:
 * react-native-vision-camera initializes Nitro objects at import time, which crashes the SSG web
 * export — the device-free screenshot path for all UI. The `.native.tsx` sibling is the real one.
 *
 * **The contract has no capture and no upload in it.** There is no `takePhoto`, no `capturedUri`,
 * no `pickAndUpload` — the ritual's mode does not merely decline to use those paths, it does not
 * have them (02 §10.4). That is what makes "no photo is taken, nothing is uploaded" a property of
 * the code rather than a promise in the copy.
 */
export interface SealCheckIn {
  /** Camera permission state, mirroring the capture engine's gate vocabulary. */
  gate: 'pending' | 'live' | 'ask_again' | 'blocked' | 'unsupported';
  /** The live camera element. Rendered full-bleed by the view; never imported by a screen. */
  feed: ReactNode | undefined;
  /** A hand is currently in frame. */
  handPresent: boolean;
  /** The pose is inside tolerances — flat, facing, framed. */
  poseReady: boolean;
  /** Consecutive frames whose signature matched the enrolled palm. */
  matchStreak: number;
  /** The match landed. Latches: a hand leaving frame cannot un-seal the day. */
  matched: boolean;
  /** ms since the ritual opened, for the timeout ladder. */
  elapsedMs: number;
  /** A camera problem worth showing, in warm language. */
  error: string | null;
  retryPermission: () => Promise<void> | void;
}

export interface SealCheckInOptions {
  /** The enrolled palm signature to match against. Null → the ritual can only offer the tap. */
  enrolled: StoredHandSignature | null;
}

/** Web / unsupported: no camera, so the ritual is never offered. The entry link is hidden upstream. */
export function useSealCheckIn(_options: SealCheckInOptions): SealCheckIn {
  return {
    gate: 'unsupported',
    feed: undefined,
    handPresent: false,
    poseReady: false,
    matchStreak: 0,
    matched: false,
    elapsedMs: 0,
    error: null,
    retryPermission: () => {},
  };
}
