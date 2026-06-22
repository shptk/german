/*
 * Smart-auto catch-up after missed days (DESIGN §5.3) — presented to the
 * learner, never applied silently, never punishing. If the deficit can be
 * re-spread while the worst upcoming day stays within budget×tolerance, keep
 * the A1 date; otherwise recommend the MINIMUM date push. Plus the recap that
 * resurfaces missed material first so there's no hole.
 */

import type { CatchupDecision, Course, PaceConfig, PacePlan, Recap, SrsCard } from './types';
import { DEFAULT_CONFIG } from './config';
import { forecastReviewMinutes } from './forecast';
import { lessonsNotDone } from './prereq';
import { activeDaysBetween } from './pace';
import { addDays, isOnOrBefore, parseDayKey } from './time';

export interface CatchupInput {
  plan: PacePlan;
  cards: SrsCard[];
  course: Course;
  done: ReadonlySet<string>;
  todayKey: string;
  config?: PaceConfig;
}

function worstDayMinutes(
  reviewMins: number[],
  maxReviewMin: number,
  newPerDay: number,
  avgLessonMin: number,
): number {
  const newLoad = newPerDay * avgLessonMin;
  if (reviewMins.length === 0) return newLoad;
  let worst = 0;
  for (const rm of reviewMins) worst = Math.max(worst, Math.min(rm, maxReviewMin) + newLoad);
  return worst;
}

export function smartCatchup(input: CatchupInput): CatchupDecision {
  const config = input.config ?? DEFAULT_CONFIG;
  const { plan, cards, course, done, todayKey } = input;
  const remaining = lessonsNotDone(course, done);
  if (remaining.length === 0) return { kind: 'none', projectedDailyMin: 0 };

  const budget = plan.dailyTimeBudgetMin;
  const avgLessonMin =
    remaining.reduce((s, l) => s + (l.estMinutes || config.defaultLessonMin), 0) / remaining.length;

  const evalWorst = (daysLeft: number): number => {
    const d = Math.max(1, daysLeft);
    const newPerDay = Math.ceil(remaining.length / d);
    return worstDayMinutes(forecastReviewMinutes(cards, todayKey, d, config), config.maxReviewMin, newPerDay, avgLessonMin);
  };

  const baseDays = Math.max(1, activeDaysBetween(plan, todayKey, plan.targetDayKey));
  const worstKeep = evalWorst(baseDays);

  if (worstKeep <= budget * config.spreadTolerance) {
    return { kind: 'respread', projectedDailyMin: Math.round(worstKeep) };
  }

  for (let push = 1; push <= 730; push++) {
    if (evalWorst(baseDays + push) <= budget) {
      return {
        kind: 'push',
        projectedDailyMin: Math.round(worstKeep),
        pushDays: push,
        newTargetDayKey: addDays(plan.targetDayKey, push),
      };
    }
  }
  // Degenerate (e.g. review load alone exceeds budget): push by the remaining count.
  return {
    kind: 'push',
    projectedDailyMin: Math.round(worstKeep),
    pushDays: remaining.length,
    newTargetDayKey: addDays(plan.targetDayKey, remaining.length),
  };
}

export interface RecapInput {
  plan: PacePlan;
  cards: SrsCard[];
  course: Course;
  done: ReadonlySet<string>;
  todayKey: string;
  config?: PaceConfig;
  isDeprecated?: (vocabId: string) => boolean;
}

/** Resurface, first, what was missed: most-overdue reviews + the next lessons, capped to a fraction of the budget. */
export function buildRecap(input: RecapInput): Recap {
  const config = input.config ?? DEFAULT_CONFIG;
  const { plan, cards, course, done, todayKey } = input;
  const isDeprecated = input.isDeprecated ?? (() => false);
  const recapBudget = plan.dailyTimeBudgetMin * config.recapFraction;

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

  const maxOverdue = Math.max(0, Math.floor(recapBudget / config.reviewMinPerCard));
  const overdueReviews = due.slice(0, maxOverdue);

  let leftover = Math.max(0, recapBudget - overdueReviews.length * config.reviewMinPerCard);
  const missedLessons = [];
  for (const l of lessonsNotDone(course, done)) {
    const est = l.estMinutes || config.defaultLessonMin;
    if (est <= leftover) {
      leftover -= est;
      missedLessons.push(l);
    } else break;
  }

  return { missedLessons, overdueReviews };
}
