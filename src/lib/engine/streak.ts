/*
 * Streak — a soft commitment device. A missed day NEVER wipes it: any active
 * day increments it by 1 from the held value and resumes; gaps don't reset it.
 * "Activity" is completing any review/lesson OR any free-roam exercise — we
 * reward learning, not compliance. (DESIGN §5.5.)
 */

import type { DayKey, StreakState } from './types';

export function newStreak(): StreakState {
  return { current: 0, longest: 0, lastActiveDayKey: null };
}

/** Record activity on `todayKey`. Idempotent within a day. */
export function updateStreak(streak: StreakState, todayKey: DayKey): StreakState {
  if (streak.lastActiveDayKey === todayKey) return streak;
  const current = streak.lastActiveDayKey == null ? 1 : streak.current + 1;
  return {
    current,
    longest: Math.max(streak.longest, current),
    lastActiveDayKey: todayKey,
  };
}
