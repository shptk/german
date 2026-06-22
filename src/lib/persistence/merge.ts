/*
 * "Best-of, never downgrade" merge (DESIGN §4.4). Accumulating slices
 * (lessons, srs, dayLog, streak) merge record-by-record with an ms-granular
 * tie-break (fix #9); single-coherent-intent slices (settings, plan) take the
 * whole slice from the newer snapshot.
 */

import type { SrsCard } from '$engine/index';
import { compareDayKeys } from '$engine/index';
import type { AppState, DayLogEntry, LessonProgress } from './types';

const RANK: Record<LessonProgress['status'], number> = { unseen: 0, in_progress: 1, done: 2 };

function mergeRecord<T>(a: Record<string, T>, b: Record<string, T>, pick: (x: T, y: T) => T): Record<string, T> {
  const out: Record<string, T> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in out ? pick(out[k], v) : v;
  return out;
}

function mergeLesson(a: LessonProgress, b: LessonProgress): LessonProgress {
  if (RANK[a.status] !== RANK[b.status]) return RANK[a.status] > RANK[b.status] ? a : b;
  if (a.bestScore !== b.bestScore) return a.bestScore > b.bestScore ? a : b;
  return a.attempts >= b.attempts ? a : b;
}

const newerCard = (a: SrsCard, b: SrsCard): SrsCard => (a.updatedAt >= b.updatedAt ? a : b);
const newerDay = (a: DayLogEntry, b: DayLogEntry): DayLogEntry => (a.updatedAt >= b.updatedAt ? a : b);

function laterDay(a: string | null, b: string | null): string | null {
  if (a == null) return b;
  if (b == null) return a;
  return compareDayKeys(a, b) >= 0 ? a : b;
}

export function mergeStates(a: AppState, b: AppState): AppState {
  const winner = a.updatedAt >= b.updatedAt ? a : b; // for whole-slice settings/plan
  const lessons = mergeRecord(a.progress.lessons, b.progress.lessons, mergeLesson);
  const cards = mergeRecord(a.srs.cards, b.srs.cards, newerCard);
  const dayLog = mergeRecord(a.dayLog, b.dayLog, newerDay);
  const lessonsDone = Object.values(lessons).filter((l) => l.status === 'done').length;

  return {
    version: Math.max(a.version, b.version),
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
    deviceId: winner.deviceId,
    progress: {
      lessons,
      totals: {
        lessonsDone,
        exercisesDone: Math.max(a.progress.totals.exercisesDone, b.progress.totals.exercisesDone),
        vocabSeen: Object.keys(cards).length,
      },
    },
    srs: { algo: 'sm2', cards },
    dayLog,
    settings: winner.settings,
    plan: winner.plan,
    streak: {
      current: Math.max(a.streak.current, b.streak.current),
      longest: Math.max(a.streak.longest, b.streak.longest),
      lastActiveDayKey: laterDay(a.streak.lastActiveDayKey, b.streak.lastActiveDayKey),
    },
  };
}
