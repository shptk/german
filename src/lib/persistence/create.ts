/*
 * Composition root — the ONLY place a concrete store is chosen. Drive sync (M8)
 * wraps this as a decorator behind the same interface.
 */

import { IndexedDbStore } from './idb-store';
import { DriveSyncStore } from './drive/DriveSyncStore';
import type { PersistencePort } from './types';

export function createPersistence(): PersistencePort {
  const local = new IndexedDbStore();
  // Opt-in Drive sync (M8). Off by default → the Drive code is tree-shaken out
  // and the app is purely local-first. Deleting DriveSyncStore.ts + this branch
  // leaves a fully working app.
  if (import.meta.env.VITE_DRIVE_SYNC === 'on') return new DriveSyncStore(local);
  return local;
}
