/*
 * Composition root — the ONLY place a concrete store is chosen. Drive sync (M8)
 * wraps this as a decorator behind the same interface.
 */

import { IndexedDbStore } from './idb-store';
import { DriveSyncStore } from './drive/DriveSyncStore';
import { isConfigured } from './drive/auth';
import type { PersistencePort } from './types';

export function createPersistence(): PersistencePort {
  const local = new IndexedDbStore();
  // Drive sync is active whenever a Google client id is configured (or forced on
  // via env). The app stays local-first; sync only engages after sign-in.
  if (isConfigured() || import.meta.env.VITE_DRIVE_SYNC === 'on') return new DriveSyncStore(local);
  return local;
}
