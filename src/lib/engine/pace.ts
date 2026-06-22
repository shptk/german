/*
 * Pace status — ahead / on-track / behind, measured on NEW LESSONS (the finite,
 * beatable quantity) against an ideal cumulative curve. Display-only: it informs
 * catch-up and the "nudge when behind" rule but never gates content. Includes
 * the goal-date-elapsed branch (fix #2). (DESIGN §5.2/§5.4.)
 */

import type { Course, DayKey, PacePlan, PaceStatus } from './types';
import { lessonsNotDone } from './prereq';
import { compareDayKeys, daysBetween, parseDayKey } from './time';

/** Calendar days from `a` to `b`, excluding paused/frozen days. */
export function activeDaysBetween(plan: PacePlan, a: DayKey, b: DayKey): number {
  const span = daysBetween(a, b);
  if (span <= 0) return 0;
  const aMs = parseDayKey(a);
  const bMs = parseDayKey(b);
  const frozen = plan.frozenDays.filter((d) => {
    const m = parseDayKey(d);
    return m >= aMs && m < bMs;
  }).length;
  return Math.max(0, span - frozen);
}

export function paceStatus(
  plan: PacePlan,
  course: Course,
  done: ReadonlySet<string>,
  todayKey: DayKey,
): PaceStatus {
  const remaining = lessonsNotDone(course, done).length;
  const total = plan.totalNewLessonsAtStart;
  const lessonsDone = Math.max(0, total - remaining);

  const totalActive = Math.max(1, activeDaysBetween(plan, plan.startDayKey, plan.targetDayKey));
  const elapsedActive = Math.min(totalActive, activeDaysBetween(plan, plan.startDayKey, todayKey));
  const idealDone = (elapsedActive / totalActive) * total;
  const lessonsPerDay = total / totalActive;
  const delta = lessonsDone - idealDone;
  const daysAheadBehind = lessonsPerDay > 0 ? delta / lessonsPerDay : 0;

  const base = {
    lessonsDone,
    totalLessons: total,
    remainingLessons: remaining,
    idealDone,
    daysAheadBehind,
    targetDayKey: plan.targetDayKey,
  };

  if (remaining === 0) return { ...base, kind: 'done', daysAheadBehind: 0 };
  if (plan.pausedAt) return { ...base, kind: 'paused' };
  // goal date already passed with lessons left (fix #2)
  if (compareDayKeys(plan.targetDayKey, todayKey) < 0) return { ...base, kind: 'elapsed' };

  const kind = delta >= 0.5 ? 'ahead' : delta <= -0.5 ? 'behind' : 'onTrack';
  return { ...base, kind };
}

/** True when the learner is behind the ideal curve (or the date elapsed). */
export function isBehind(
  plan: PacePlan,
  course: Course,
  done: ReadonlySet<string>,
  todayKey: DayKey,
): boolean {
  const k = paceStatus(plan, course, done, todayKey).kind;
  return k === 'behind' || k === 'elapsed';
}
