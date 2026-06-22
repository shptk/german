import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { newCard } from '$engine/index';
import {
  applyBackup,
  createEmptyState,
  IndexedDbStore,
  MemoryStore,
  mergeStates,
  migrateState,
  parseBackup,
  toBackup,
  validateAppState,
  type AppState,
  type LessonProgress,
} from './index';

const doneLesson = (id: string, t = 1): LessonProgress => ({
  id,
  status: 'done',
  bestScore: 0.9,
  completedAt: t,
  attempts: 1,
  updatedAt: t,
});

describe('MemoryStore (PersistencePort)', () => {
  let counter = 0;
  const make = () => new MemoryStore('dev', () => ++counter);

  it('starts empty with no plan', async () => {
    const s = make();
    const st = await s.load();
    expect(st.version).toBe(1);
    expect(st.plan).toBeNull();
    expect(Object.keys(st.srs.cards)).toHaveLength(0);
  });

  it('persists a patch and restores it', async () => {
    const s = make();
    await s.patch((d) => {
      d.progress.lessons['l1'] = doneLesson('l1');
      d.srs.cards['a1.v.x'] = { ...newCard('a1.v.x', 1), state: 'review', dueDayKey: '2026-06-22' };
    });
    const st = await s.load();
    expect(st.progress.lessons['l1'].status).toBe('done');
    expect(st.srs.cards['a1.v.x'].state).toBe('review');
  });

  it('round-trips a backup into a fresh store (replace)', async () => {
    const s = make();
    await s.patch((d) => {
      d.progress.lessons['l1'] = doneLesson('l1');
    });
    const backup = await s.exportBackup();
    const fresh = make();
    const res = await fresh.importBackup(backup, { strategy: 'replace' });
    expect(res.ok).toBe(true);
    expect((await fresh.load()).progress.lessons['l1'].status).toBe('done');
  });
});

describe('IndexedDbStore (PersistencePort)', () => {
  it('persists across a "reload" (new instance, same DB)', async () => {
    const a = new IndexedDbStore('dev', 'db-reload');
    await a.patch((d) => {
      d.progress.lessons['l1'] = doneLesson('l1');
      d.srs.cards['a1.v.x'] = { ...newCard('a1.v.x', 1), state: 'review', dueDayKey: '2026-06-22' };
    });
    await a.close();
    const b = new IndexedDbStore('dev', 'db-reload'); // reopen same DB
    const st = await b.load();
    expect(st.progress.lessons['l1'].status).toBe('done');
    expect(st.srs.cards['a1.v.x'].state).toBe('review');
    await b.close();
  });

  it('clearLocal empties the store', async () => {
    const s = new IndexedDbStore('dev', 'db-clear');
    await s.patch((d) => {
      d.progress.lessons['l1'] = doneLesson('l1');
    });
    await s.clearLocal();
    expect(Object.keys((await s.load()).progress.lessons)).toHaveLength(0);
    await s.close();
  });

  it('restores a backup into a fresh store', async () => {
    const s = new IndexedDbStore('dev', 'db-src');
    await s.patch((d) => {
      d.progress.lessons['l1'] = doneLesson('l1');
    });
    const backup = await s.exportBackup();
    await s.close();
    const fresh = new IndexedDbStore('dev', 'db-dst'); // empty DB
    await fresh.importBackup(backup, { strategy: 'replace' });
    expect((await fresh.load()).progress.lessons['l1']).toBeDefined();
    await fresh.close();
  });
});

describe('mergeStates — best-of, never downgrade', () => {
  const base = () => createEmptyState('dev', 100);

  it('keeps the more-advanced lesson status', () => {
    const a = base();
    a.progress.lessons['l1'] = doneLesson('l1');
    const b = base();
    b.progress.lessons['l1'] = { ...doneLesson('l1'), status: 'in_progress' };
    expect(mergeStates(a, b).progress.lessons['l1'].status).toBe('done');
    expect(mergeStates(b, a).progress.lessons['l1'].status).toBe('done'); // order-independent
  });

  it('keeps the card with the newer ms updatedAt (fix #9)', () => {
    const a = base();
    a.srs.cards['c'] = { ...newCard('c', 0), intervalDays: 10, updatedAt: 2 };
    const b = base();
    b.srs.cards['c'] = { ...newCard('c', 0), intervalDays: 1, updatedAt: 1 };
    expect(mergeStates(a, b).srs.cards['c'].intervalDays).toBe(10);
  });

  it('takes the max streak and unions cards', () => {
    const a = base();
    a.streak = { current: 5, longest: 7, lastActiveDayKey: '2026-06-20' };
    a.srs.cards['x'] = newCard('x', 1);
    const b = base();
    b.streak = { current: 3, longest: 9, lastActiveDayKey: '2026-06-22' };
    b.srs.cards['y'] = newCard('y', 1);
    const m = mergeStates(a, b);
    expect(m.streak).toMatchObject({ current: 5, longest: 9, lastActiveDayKey: '2026-06-22' });
    expect(Object.keys(m.srs.cards).sort()).toEqual(['x', 'y']);
    expect(m.progress.totals.vocabSeen).toBe(2);
  });
});

describe('backup envelope', () => {
  it('round-trips with a valid checksum', () => {
    const s = createEmptyState('dev', 5);
    s.progress.lessons['l1'] = doneLesson('l1');
    const parsed = parseBackup(toBackup(s, '2026-06-22T00:00:00Z'));
    expect(parsed.checksumOk).toBe(true);
    expect(parsed.state.progress.lessons['l1'].status).toBe('done');
  });

  it('warns (does not crash) on a checksum mismatch', () => {
    const s = createEmptyState('dev', 5);
    const b = toBackup(s, '2026-06-22T00:00:00Z');
    b.state.deviceId = 'tampered'; // mutate after checksum
    const parsed = parseBackup(b);
    expect(parsed.checksumOk).toBe(false);
    expect(parsed.warnings.join(' ')).toContain('checksum');
  });

  it('rejects a non-magic JSON file', () => {
    expect(() => parseBackup({ hello: 'world' })).toThrow();
  });

  it('replace warns when the backup is older than current', () => {
    const current = createEmptyState('dev', 1000);
    const old = createEmptyState('dev', 10);
    const { result } = applyBackup(toBackup(old, 'x'), current, 'replace');
    expect(result.warnings.join(' ')).toContain('OLDER');
  });
});

describe('migrations', () => {
  it('migrates a v0 state up to the current shape', () => {
    const v0 = { version: 0, updatedAt: 1, deviceId: 'd', progress: { lessons: {}, totals: { lessonsDone: 0, exercisesDone: 0, vocabSeen: 0 } }, srs: { algo: 'sm2', cards: {} }, settings: { ttsVoiceURI: null, ttsRate: 0.9, theme: 'system', reduceMotion: false, autoPlayGermanOnReveal: false }, plan: null } as Record<string, unknown>;
    const migrated = migrateState(v0);
    expect(migrated.version).toBe(1);
    const valid: AppState = validateAppState(migrated);
    expect(valid.dayLog).toEqual({});
    expect(valid.streak).toEqual({ current: 0, longest: 0, lastActiveDayKey: null });
  });
});
