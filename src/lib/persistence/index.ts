/*
 * The swappable storage boundary. Engine and UI depend ONLY on PersistencePort.
 * Concrete stores (IndexedDbStore now, DriveSyncStore in M8) are the only code
 * permitted to name storage concretes — enforced by scripts/check-boundaries.sh.
 * (DESIGN §4.)
 */

export * from './types';
export * from './checksum';
export * from './migrations';
export * from './validate';
export * from './merge';
export * from './backup';
export { createEmptyState, generateDeviceId } from './emptyState';
export { MemoryStore } from './memory-store';
export { IndexedDbStore } from './idb-store';
export { createPersistence } from './create';
