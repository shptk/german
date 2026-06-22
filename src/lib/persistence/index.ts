/*
 * The swappable storage boundary. Engine and UI depend ONLY on PersistencePort.
 * Concrete implementations (IndexedDbStore now, DriveSyncStore later) are the
 * only code permitted to name storage concretes (indexedDB, idb, /drive/v3,
 * google.accounts, appDataFolder) — enforced by scripts/check-boundaries.sh.
 *
 * The full interface + IndexedDB implementation land in M3, Drive sync in M8
 * (see DESIGN.md §4). This stub fixes the shape of the seam.
 */

export interface PersistencePort {
  /** Open storage and run migrations; idempotent. */
  init(): Promise<void>;
  // Full surface (load/save/patch/exportBackup/importBackup/sync/...) defined in M3.
}

/**
 * Composition root — the ONLY place a concrete store is named. Wired up in M3.
 */
export function createPersistence(): PersistencePort {
  throw new Error('persistence not yet implemented (Milestone M3)');
}
