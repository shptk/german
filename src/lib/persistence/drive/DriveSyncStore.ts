/*
 * Google Drive sync as a DROP-IN decorator over IndexedDbStore. IndexedDB stays
 * the offline source of truth + read cache; Drive (drive.file, one app-owned
 * file) is a remote replica of the backup envelope. Every load/patch/export
 * reads local, so the app is fully offline-capable and identical with or without
 * cloud. Mirrors the todo-tracker sync model (reuses its client id); merge is
 * best-of/never-downgrade (mergeStates).
 */

import { parseBackup, toBackup } from '../backup';
import { mergeStates } from '../merge';
import type { AppState, ImportResult, PersistencePort, SyncResult, SyncStatus } from '../types';
import type { IndexedDbStore } from '../idb-store';
import { connect, disconnect, getProfile, getToken, isConfigured, isConnected, subscribeAuth } from './auth';
import { createFile, deleteFile, findFileId, readFile, writeFile } from './driveRest';

const PUSH_DEBOUNCE_MS = 4000;

export class DriveSyncStore implements PersistencePort {
  private status: SyncStatus;
  private listeners = new Set<(s: SyncStatus) => void>();
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private fileId: string | null = null;

  constructor(private local: IndexedDbStore) {
    this.status = isConnected() ? { kind: 'idle', lastSyncedAt: 0 } : { kind: 'local-only' };
    // React to sign-in/out from anywhere.
    subscribeAuth((p) => {
      if (p) void this.sync();
      else this.set({ kind: 'local-only' });
    });
  }

  // ---- local-first surface ----
  async init() {
    await this.local.init();
    if (isConnected()) void this.sync(); // pull-on-load (silent)
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

  // ---- status ----
  getSyncStatus(): SyncStatus {
    return this.status;
  }
  onSyncStatusChange(cb: (s: SyncStatus) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  cloudProfile() {
    const p = getProfile();
    return p ? { email: p.email, name: p.name } : null;
  }
  private set(s: SyncStatus) {
    this.status = s;
    for (const l of this.listeners) l(s);
  }

  // ---- connect / disconnect / clear ----
  async connectCloud(): Promise<void> {
    await connect();
    await this.sync();
  }
  async disconnectCloud(): Promise<void> {
    disconnect();
    this.fileId = null;
    this.set({ kind: 'local-only' });
  }
  async clearCloud(): Promise<void> {
    if (!isConnected()) return; // nothing remote to clear when signed out
    const token = await getToken();
    if (!token) return;
    const id = this.fileId ?? (await findFileId(token));
    if (id) await deleteFile(token, id);
    this.fileId = null;
  }

  private schedulePush() {
    if (!isConnected()) return;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => void this.sync(), PUSH_DEBOUNCE_MS);
  }

  /** Pull → merge (best-of) → push. Safe to call repeatedly. */
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
      if (!token) {
        this.set({ kind: 'offline' });
        return { kind: 'noop' };
      }
      const local = await this.local.load();
      if (!this.fileId) this.fileId = await findFileId(token);

      if (!this.fileId) {
        this.fileId = await createFile(token, toBackup(local, new Date().toISOString()));
        this.set({ kind: 'idle', lastSyncedAt: Date.now() });
        return { kind: 'pushed' };
      }

      const raw = await readFile(token, this.fileId);
      if (raw == null) {
        await writeFile(token, this.fileId, toBackup(local, new Date().toISOString()));
        this.set({ kind: 'idle', lastSyncedAt: Date.now() });
        return { kind: 'pushed' };
      }
      const remoteState = parseBackup(raw).state;
      const merged = mergeStates(local, remoteState);
      await this.local.importBackup(toBackup(merged, new Date().toISOString()), { strategy: 'replace' });
      await writeFile(token, this.fileId, toBackup(merged, new Date().toISOString()));
      this.set({ kind: 'idle', lastSyncedAt: Date.now() });
      return { kind: 'merged' };
    } catch (e) {
      this.set({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
      return { kind: 'noop' };
    }
  }
}
