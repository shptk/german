/*
 * Composition root — the ONLY place a concrete store is chosen. Drive sync (M8)
 * wraps this as a decorator behind the same interface.
 */

import { IndexedDbStore } from './idb-store';
import type { PersistencePort } from './types';

export function createPersistence(): PersistencePort {
  // M8: if (import.meta.env.VITE_DRIVE_SYNC === 'on') return new DriveSyncStore(new IndexedDbStore());
  return new IndexedDbStore();
}
