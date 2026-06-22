/*
 * Persisted state shapes + the storage boundary interface (DESIGN §4).
 * AppState is ONE logical document containing only content IDs + per-user state
 * + timestamps — never content text — so a corrected content re-ship needs no
 * data migration, and the synced/backed-up blob stays tiny.
 */

import type { DayKey, PacePlan, SrsCard, StreakState } from '$engine/index';

/** Bump when the logical shape changes; travels inside backups + cloud blobs. */
export const APP_STATE_VERSION = 1 as const;

export type LessonStatus = 'unseen' | 'in_progress' | 'done';

export interface LessonProgress {
  id: string;
  status: LessonStatus;
  bestScore: number; // 0..1
  completedAt: number | null;
  attempts: number;
  updatedAt: number;
}

export interface Totals {
  lessonsDone: number;
  exercisesDone: number;
  vocabSeen: number;
}

export interface DayLogEntry {
  dayKey: DayKey;
  recommendedNew: number;
  doneNew: number;
  recommendedReviews: number;
  doneReviews: number;
  estMinPlanned: number;
  actualMinSpent: number;
  updatedAt: number;
}

export interface Settings {
  ttsVoiceURI: string | null;
  ttsRate: number;
  theme: 'system' | 'light' | 'dark';
  reduceMotion: boolean;
  autoPlayGermanOnReveal: boolean;
}

export function defaultSettings(): Settings {
  return {
    ttsVoiceURI: null,
    ttsRate: 0.9,
    theme: 'system',
    reduceMotion: false,
    autoPlayGermanOnReveal: false,
  };
}

export interface AppState {
  version: number; // == APP_STATE_VERSION
  updatedAt: number; // epoch ms — sync/merge tie-breaker
  deviceId: string;
  progress: { lessons: Record<string, LessonProgress>; totals: Totals };
  srs: { algo: 'sm2'; cards: Record<string, SrsCard> };
  dayLog: Record<string, DayLogEntry>; // keyed by dayKey
  settings: Settings;
  plan: PacePlan | null; // null until onboarding sets a goal
  streak: StreakState;
}

/* ---- backup envelope ---- */

export const BACKUP_FORMAT_VERSION = 1 as const;

export interface BackupFile {
  format: 'german-a1-backup';
  backupVersion: number;
  exportedAt: string; // ISO
  app: { name: 'German A1'; build: string };
  state: AppState;
  checksum: { algo: 'fnv1a-32'; value: string };
}

export interface ImportResult {
  ok: boolean;
  strategy: 'replace' | 'merge';
  checksumOk: boolean;
  migratedFrom: number; // the version the imported state started at
  warnings: string[];
}

/* ---- sync (local-only now; Drive in M8) ---- */

export type SyncStatus =
  | { kind: 'local-only' }
  | { kind: 'idle'; lastSyncedAt: number }
  | { kind: 'syncing' }
  | { kind: 'offline' }
  | { kind: 'conflict'; resolvable: boolean }
  | { kind: 'error'; message: string };

export type SyncResult = { kind: 'local-only' } | { kind: 'noop' } | { kind: 'pushed' } | { kind: 'pulled' } | { kind: 'merged' };

/** The ONLY storage type the engine and UI depend on. */
export interface PersistencePort {
  init(): Promise<void>;
  load(): Promise<AppState>;
  save(s: AppState): Promise<void>;
  /** Hot path: surgical mutation of the snapshot; stamps updatedAt. */
  patch(mutate: (draft: AppState) => void): Promise<AppState>;
  exportBackup(): Promise<BackupFile>;
  importBackup(file: unknown, opts?: { strategy: 'replace' | 'merge' }): Promise<ImportResult>;
  sync(): Promise<SyncResult>;
  getSyncStatus(): SyncStatus;
  onSyncStatusChange(cb: (s: SyncStatus) => void): () => void;
  connectCloud?(): Promise<void>;
  disconnectCloud?(): Promise<void>;
  /** Delete the remote synced copy (used by Reset progress). */
  clearCloud?(): Promise<void>;
  /** Identity of the signed-in cloud account, if any. */
  cloudProfile?(): { email: string; name: string } | null;
  clearLocal(): Promise<void>;
}
