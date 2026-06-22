/*
 * recommendToday — the daily recommendation (DESIGN §5.2). It RECOMMENDS; it
 * never gates (free-roam is always available). Due reviews are time-first and
 * capped per day (fix #1): overflow is rescheduled forward, never dropped.
 * New lessons are smoothed so total time/day stays ~flat as review load grows.
 */

import type { Course, DayQueue, Lesson, PaceConfig, PacePlan, SrsCard } from './types';
import { DEFAULT_CONFIG } from './config';
import { lessonsNotDone } from './prereq';
import { activeDaysBetween, isBehind } from './pace';
import { addDays, isOnOrBefore, parseDayKey } from './time';

export interface RecommendInput {
  plan: PacePlan;
  cards: SrsCard[];
  course: Course;
  done: ReadonlySet<string>;
  todayKey: string;
  nowMs: number;
  isDeprecated?: (vocabId: string) => boolean; // fix #13: drop deprecated-content cards
  config?: PaceConfig;
}

/** 0 when paused or on a frozen day; otherwise the plan's daily budget. */
export function effectiveDailyBudget(plan: PacePlan, todayKey: string): number {
  if (plan.pausedAt) return 0;
  if (plan.frozenDays.includes(todayKey)) return 0;
  return plan.dailyTimeBudgetMin;
}

export function recommendToday(input: RecommendInput): DayQueue {
  const config = input.config ?? DEFAULT_CONFIG;
  const { plan, cards, course, done, todayKey, nowMs } = input;
  const isDeprecated = input.isDeprecated ?? (() => false);

  // Paused / frozen day: recommend nothing, no guilt (cards keep aging; the
  // recap resurfaces them on resume).
  const budget = effectiveDailyBudget(plan, todayKey);
  if (budget <= 0) {
    return { reviews: [], deferredReviews: [], newLessons: [], estMin: 0, reviewsHeavy: false };
  }

  // 1. Due reviews — active, non-deprecated, due — most overdue first.
  const due = cards
    .filter(
      (c) =>
        !c.suspended &&
        c.state !== 'new' &&
        c.dueDayKey != null &&
        !isDeprecated(c.id) &&
        isOnOrBefore(c.dueDayKey, todayKey),
    )
    .sort((a, b) => parseDayKey(a.dueDayKey as string) - parseDayKey(b.dueDayKey as string));

  // 2. Per-day review cap; overflow rolls forward to tomorrow (never dropped).
  const maxReviews = Math.max(0, Math.floor(config.maxReviewMin / config.reviewMinPerCard));
  const reviews = due.slice(0, maxReviews);
  const deferredReviews: SrsCard[] = due
    .slice(maxReviews)
    .map((c) => ({ ...c, dueDayKey: addDays(todayKey, 1), updatedAt: nowMs }));
  const reviewMin = reviews.length * config.reviewMinPerCard;

  // 3. New lessons — smoothed, whole, prereq order.
  const remaining = lessonsNotDone(course, done);
  let newLessons: Lesson[] = [];
  if (remaining.length > 0) {
    const newBudget = Math.max(0, budget - reviewMin);
    let fit = 0;
    let acc = 0;
    for (const l of remaining) {
      const est = l.estMinutes || config.defaultLessonMin;
      if (acc + est <= newBudget) {
        acc += est;
        fit += 1;
      } else break;
    }
    const daysLeft = Math.max(1, activeDaysBetween(plan, todayKey, plan.targetDayKey));
    const idealPerDay = remaining.length / daysLeft;
    let target = Math.min(fit, Math.max(0, Math.round(idealPerDay)));
    // never stall a day that has capacity while behind
    if (target === 0 && fit >= 1 && isBehind(plan, course, done, todayKey)) target = 1;
    newLessons = remaining.slice(0, target);
  }

  const estMin =
    reviewMin + newLessons.reduce((s, l) => s + (l.estMinutes || config.defaultLessonMin), 0);
  const reviewsHeavy = budget > 0 && reviewMin >= budget && newLessons.length === 0;

  return { reviews, deferredReviews, newLessons, estMin, reviewsHeavy };
}
