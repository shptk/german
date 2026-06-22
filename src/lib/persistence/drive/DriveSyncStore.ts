/*
 * Google Drive sync as a DROP-IN decorator over IndexedDbStore (M8). IndexedDB
 * stays the offline source of truth + read cache; Drive is a remote replica of
 * the same backup envelope. Every load/patch/export reads local, so the app is
 * fully offline-capable and identical with or without cloud — cloud only adds a
 * background pull/merge/push. Deleting this file + the create.ts branch leaves a
 * working local-first app.
 */

import { parseBackup, toBackup } from '../backup';
import { mergeStates } from '../merge';
import type { AppState, ImportResult, PersistencePort, SyncResult, SyncStatus } from '../types';
import type { IndexedDbStore } from '../idb-store';
import { connect, disconnect, getToken, isConfigured, isConnected } from './auth';
import { createState, findStateFile, readState, updateState } from './driveRest';

const PUSH_DEBOUNCE_MS = 8000;

export class DriveSyncStore implements PersistencePort {
  private status: SyncStatus = { kind: 'local-only' };
  private listeners = new Set<(s: SyncStatus) => void>();
  private pushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private local: IndexedDbStore) {}

  // ---- delegate the local-first surface ----
  init() {
    return this.local.init();
  }
  load() {
    return this.local.load();
  }
  save(s: AppState) {
    return this.local.save(s);
  }
  exportBackup() {
    return this.local.exportBackup();
  }
  importBackup(file: unknown, opts?: { strategy: 'replace' | 'merge' }): Promise<ImportResult> {
    return this.local.importBackup(file, opts);
  }
  clearLocal() {
    return this.local.clearLocal();
  }

  async patch(mutate: (draft: AppState) => void): Promise<AppState> {
    const s = await this.local.patch(mutate);
    this.schedulePush();
    return s;
  }

  // ---- sync status ----
  getSyncStatus(): SyncStatus {
    return this.status;
  }
  onSyncStatusChange(cb: (s: SyncStatus) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  private set(s: SyncStatus) {
    this.status = s;
    for (const l of this.listeners) l(s);
  }

  // ---- cloud connect / disconnect ----
  async connectCloud(): Promise<void> {
    await connect();
    await this.sync();
  }
  async disconnectCloud(): Promise<void> {
    disconnect();
    this.set({ kind: 'local-only' });
  }

  private schedulePush() {
    if (!isConnected()) return;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      void this.sync();
    }, PUSH_DEBOUNCE_MS);
  }

  /** Pull + merge (best-of, never-downgrade) + push. Safe to call repeatedly. */
  async sync(): Promise<SyncResult> {
    if (!isConfigured() || !isConnected()) {
      this.set({ kind: 'local-only' });
      return { kind: 'local-only' };
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.set({ kind: 'offline' });
      return { kind: 'noop' };
    }
    try {
      this.set({ kind: 'syncing' });
      const token = await getToken();
      const local = await this.local.load();
      const remote = await findStateFile(token);

      if (!remote) {
        await createState(token, toBackup(local, new Date().toISOString()), local.updatedAt);
        this.set({ kind: 'idle', lastSyncedAt: Date.now() });
        return { kind: 'pushed' };
      }

      const remoteState = parseBackup(await readState(token, remote.id)).state;
      const merged = mergeStates(local, remoteState);

      // Write the merged result locally (idempotent best-of) and remotely.
      await this.local.importBackup(toBackup(merged, new Date().toISOString()), { strategy: 'replace' });
      await updateState(token, remote.id, toBackup(merged, new Date().toISOString()), merged.updatedAt);

      this.set({ kind: 'idle', lastSyncedAt: Date.now() });
      return { kind: 'merged' };
    } catch (e) {
      this.set({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
      return { kind: 'noop' };
    }
  }
}
