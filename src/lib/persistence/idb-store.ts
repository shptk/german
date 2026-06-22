/*
 * Local-first IndexedDB store (DESIGN §4.3). Split object stores
 * (meta / lessons / srs[+by_dueDayKey] / dayLog / kv) re-assembled into one
 * AppState on load. This is the ONLY place IndexedDB is named (boundary gate).
 */

import { openDB, type IDBPDatabase } from 'idb';
import { applyBackup, toBackup } from './backup';
import { createEmptyState, generateDeviceId } from './emptyState';
import {
  defaultSettings,
  type AppState,
  type DayLogEntry,
  type ImportResult,
  type LessonProgress,
  type PersistencePort,
  type Settings,
  type SyncResult,
  type SyncStatus,
  type Totals,
} from './types';
import type { PacePlan, SrsCard, StreakState } from '$engine/index';

const DB_NAME = 'german-a1';
const DB_VERSION = 1;
const STORES = ['meta', 'lessons', 'srs', 'dayLog', 'kv'] as const;

const byId = <T extends { id: string }>(arr: T[]): Record<string, T> =>
  Object.fromEntries(arr.map((x) => [x.id, x]));

export class IndexedDbStore implements PersistencePort {
  private dbp: Promise<IDBPDatabase> | null = null;
  constructor(
    private deviceId: string = generateDeviceId(),
    private dbName: string = DB_NAME,
  ) {}

  private db(): Promise<IDBPDatabase> {
    if (!this.dbp) {
      this.dbp = openDB(this.dbName, DB_VERSION, {
        upgrade(db) {
          db.createObjectStore('meta');
          db.createObjectStore('lessons', { keyPath: 'id' });
          const srs = db.createObjectStore('srs', { keyPath: 'id' });
          srs.createIndex('by_dueDayKey', 'dueDayKey');
          db.createObjectStore('dayLog', { keyPath: 'dayKey' });
          db.createObjectStore('kv');
        },
      });
    }
    return this.dbp;
  }

  async init(): Promise<void> {
    const db = await this.db();
    if (!(await db.get('meta', 'root'))) await this.save(createEmptyState(this.deviceId, Date.now()));
  }

  async load(): Promise<AppState> {
    const db = await this.db();
    const meta = (await db.get('meta', 'root')) as
      | { version: number; updatedAt: number; deviceId: string }
      | undefined;
    if (!meta) {
      const s = createEmptyState(this.deviceId, Date.now());
      await this.save(s);
      return s;
    }
    const [lessons, cards, days, settings, plan, streak, totals] = await Promise.all([
      db.getAll('lessons') as Promise<LessonProgress[]>,
      db.getAll('srs') as Promise<SrsCard[]>,
      db.getAll('dayLog') as Promise<DayLogEntry[]>,
      db.get('kv', 'settings') as Promise<Settings | undefined>,
      db.get('kv', 'plan') as Promise<PacePlan | null | undefined>,
      db.get('kv', 'streak') as Promise<StreakState | undefined>,
      db.get('kv', 'totals') as Promise<Totals | undefined>,
    ]);
    return {
      version: meta.version,
      updatedAt: meta.updatedAt,
      deviceId: meta.deviceId,
      progress: { lessons: byId(lessons), totals: totals ?? { lessonsDone: 0, exercisesDone: 0, vocabSeen: 0 } },
      srs: { algo: 'sm2', cards: byId(cards) },
      dayLog: Object.fromEntries(days.map((d) => [d.dayKey, d])),
      settings: settings ?? defaultSettings(),
      plan: plan ?? null,
      streak: streak ?? { current: 0, longest: 0, lastActiveDayKey: null },
    };
  }

  async save(s: AppState): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORES as unknown as string[], 'readwrite');
    const meta = tx.objectStore('meta');
    const lessons = tx.objectStore('lessons');
    const srs = tx.objectStore('srs');
    const dayLog = tx.objectStore('dayLog');
    const kv = tx.objectStore('kv');
    await Promise.all([lessons.clear(), srs.clear(), dayLog.clear()]);
    await meta.put({ version: s.version, updatedAt: s.updatedAt, deviceId: s.deviceId }, 'root');
    for (const l of Object.values(s.progress.lessons)) await lessons.put(l);
    for (const c of Object.values(s.srs.cards)) await srs.put(c);
    for (const d of Object.values(s.dayLog)) await dayLog.put(d);
    await kv.put(s.settings, 'settings');
    await kv.put(s.plan, 'plan');
    await kv.put(s.streak, 'streak');
    await kv.put(s.progress.totals, 'totals');
    await tx.done;
  }

  async patch(mutate: (draft: AppState) => void): Promise<AppState> {
    const s = await this.load();
    mutate(s);
    s.updatedAt = Date.now();
    await this.save(s);
    return s;
  }

  async exportBackup() {
    return toBackup(await this.load(), new Date().toISOString());
  }
  async importBackup(file: unknown, opts?: { strategy: 'replace' | 'merge' }): Promise<ImportResult> {
    const current = await this.load();
    const { state, result } = applyBackup(file, current, opts?.strategy ?? 'merge');
    await this.save(state);
    return result;
  }
  async sync(): Promise<SyncResult> {
    return { kind: 'local-only' };
  }
  getSyncStatus(): SyncStatus {
    return { kind: 'local-only' };
  }
  onSyncStatusChange(): () => void {
    return () => {};
  }
  async clearLocal(): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORES as unknown as string[], 'readwrite');
    await Promise.all(STORES.map((s) => tx.objectStore(s).clear()));
    await tx.done;
  }

  /** Close the underlying connection (so the DB can be deleted/reopened). */
  async close(): Promise<void> {
    if (this.dbp) {
      (await this.dbp).close();
      this.dbp = null;
    }
  }
}
