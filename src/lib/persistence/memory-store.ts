/*
 * In-memory PersistencePort — the test fake and a fallback. Same interface as
 * IndexedDbStore, so the swap-test proves nothing outside persistence/ changes.
 */

import { applyBackup, toBackup } from './backup';
import { createEmptyState } from './emptyState';
import type { AppState, ImportResult, PersistencePort, SyncResult, SyncStatus } from './types';

export class MemoryStore implements PersistencePort {
  private state: AppState | null = null;
  private listeners = new Set<(s: SyncStatus) => void>();

  /** `now` is injectable so tests get deterministic timestamps. */
  constructor(
    private deviceId = 'memory-device',
    private now: () => number = () => 0,
  ) {}

  async init(): Promise<void> {
    if (!this.state) this.state = createEmptyState(this.deviceId, this.now());
  }
  async load(): Promise<AppState> {
    await this.init();
    return structuredClone(this.state as AppState);
  }
  async save(s: AppState): Promise<void> {
    this.state = structuredClone(s);
  }
  async patch(mutate: (draft: AppState) => void): Promise<AppState> {
    await this.init();
    const draft = structuredClone(this.state as AppState);
    mutate(draft);
    draft.updatedAt = this.now();
    this.state = draft;
    return structuredClone(draft);
  }
  async exportBackup() {
    await this.init();
    return toBackup(this.state as AppState, new Date(this.now()).toISOString());
  }
  async importBackup(file: unknown, opts?: { strategy: 'replace' | 'merge' }): Promise<ImportResult> {
    await this.init();
    const { state, result } = applyBackup(file, this.state as AppState, opts?.strategy ?? 'merge');
    this.state = state;
    return result;
  }
  async sync(): Promise<SyncResult> {
    return { kind: 'local-only' };
  }
  getSyncStatus(): SyncStatus {
    return { kind: 'local-only' };
  }
  onSyncStatusChange(cb: (s: SyncStatus) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  async clearLocal(): Promise<void> {
    this.state = null;
  }
}
