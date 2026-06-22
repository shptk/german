/*
 * The one pace-derivation path for BOTH presets and custom dates (DESIGN §5.2).
 *
 * A preset fixes the daily budget and derives the finish date; a custom date
 * fixes the finish date and derives the required budget. Both run the SAME
 * day-by-day simulation: each day do due reviews (capped, overflow carries),
 * then fit whole lessons (prereq order) into the remaining budget, advancing a
 * simulated SRS deck (new lessons' vocab enters due the next day).
 */

import type { Course, DayKey, PaceConfig, PaceIntent, PacePlan, SrsCard } from './types';
import { DEFAULT_CONFIG, PRESETS } from './config';
import { EF_START } from './srs';
import { projectNextInterval } from './forecast';
import { lessonsNotDone } from './prereq';
import { addDays, parseDayKey } from './time';

const MAX_SIM_DAYS = 3650;
const UNREACHABLE = 3650;

interface SimCard {
  due: number;
  interval: number;
  ef: number;
}

/**
 * Active-day INDEX (0-based) on which the last lesson completes at this budget.
 * -1 if nothing remains; Infinity if unreachable (a lesson can't fit the budget,
 * or it doesn't finish within MAX_SIM_DAYS).
 */
function simulateFinishIndex(
  course: Course,
  doneIds: ReadonlySet<string>,
  startCards: SrsCard[],
  budgetMin: number,
  startDayKey: DayKey,
  config: PaceConfig,
): number {
  const lessons = lessonsNotDone(course, doneIds);
  if (lessons.length === 0) return -1;

  const biggest = Math.max(...lessons.map((l) => l.estMinutes || config.defaultLessonMin));
  if (biggest > budgetMin) return Infinity; // can never do the biggest lesson

  const deck: SimCard[] = startCards
    .filter((c) => !c.suspended && c.state !== 'new' && c.dueDayKey != null)
    .map((c) => ({ due: parseDayKey(c.dueDayKey as string), interval: c.intervalDays, ef: c.easiness }));
  const maxReviews = Math.max(0, Math.floor(config.maxReviewMin / config.reviewMinPerCard));

  let li = 0;
  for (let day = 0; day < MAX_SIM_DAYS; day++) {
    if (li >= lessons.length) return day - 1 < 0 ? 0 : day - 1;
    const dayMs = parseDayKey(addDays(startDayKey, day));

    // due reviews (capped; overflow carries to a later day untouched)
    const due = deck.filter((c) => c.due <= dayMs);
    const doNow = Math.min(due.length, maxReviews);
    const reviewMin = doNow * config.reviewMinPerCard;
    for (let n = 0; n < doNow; n++) {
      const c = due[n];
      c.interval = projectNextInterval(c.interval, c.ef, config.assumedPassRate);
      c.due = parseDayKey(addDays(startDayKey, day + c.interval));
    }

    // whole lessons that fit the remaining budget, in prereq order
    let budgetLeft = Math.max(0, budgetMin - reviewMin);
    while (li < lessons.length) {
      const est = lessons[li].estMinutes || config.defaultLessonMin;
      if (est > budgetLeft) break;
      budgetLeft -= est;
      for (let v = 0; v < lessons[li].introducesVocab.length; v++) {
        deck.push({ due: parseDayKey(addDays(startDayKey, day + 1)), interval: 0, ef: EF_START });
      }
      li++;
    }
    if (li >= lessons.length) return day;
  }
  return Infinity;
}

/** Finish day for a given daily budget. */
export function deriveDateFromBudget(
  course: Course,
  doneIds: ReadonlySet<string>,
  cards: SrsCard[],
  budgetMin: number,
  startDayKey: DayKey,
  config: PaceConfig = DEFAULT_CONFIG,
): DayKey {
  const idx = simulateFinishIndex(course, doneIds, cards, budgetMin, startDayKey, config);
  if (idx === Infinity) return addDays(startDayKey, UNREACHABLE);
  if (idx < 0) return startDayKey;
  return addDays(startDayKey, idx);
}

/**
 * Smallest daily budget whose simulated finish is on/before `targetDayKey`
 * (monotonic — more budget never finishes later — so a binary search is
 * well-defined; fix #14). Returns the search ceiling if even that can't make it.
 */
export function deriveBudgetFromDate(
  course: Course,
  doneIds: ReadonlySet<string>,
  cards: SrsCard[],
  targetDayKey: DayKey,
  startDayKey: DayKey,
  config: PaceConfig = DEFAULT_CONFIG,
): number {
  const remaining = lessonsNotDone(course, doneIds);
  if (remaining.length === 0) return 0;

  const totalMin = remaining.reduce((s, l) => s + (l.estMinutes || config.defaultLessonMin), 0);
  const ceiling = Math.ceil(totalMin) + config.maxReviewMin + 1; // a one-day-ish budget
  const target = parseDayKey(targetDayKey);
  const fits = (b: number) =>
    parseDayKey(deriveDateFromBudget(course, doneIds, cards, b, startDayKey, config)) <= target;

  if (!fits(ceiling)) return ceiling; // unreachable even flat-out
  let lo = 1;
  let hi = ceiling;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

/** Build a fresh plan from the learner's intent (preset OR custom date — one path). */
export function buildPlan(
  course: Course,
  cards: SrsCard[],
  doneIds: ReadonlySet<string>,
  startDayKey: DayKey,
  intent: PaceIntent,
  config: PaceConfig = DEFAULT_CONFIG,
  hardCapMin = 60,
): PacePlan {
  const totalNew = lessonsNotDone(course, doneIds).length;
  if (intent.kind === 'preset') {
    const budget = PRESETS[intent.presetId];
    return {
      mode: 'preset',
      presetId: intent.presetId,
      dailyTimeBudgetMin: budget,
      hardCapMin,
      startDayKey,
      targetDayKey: deriveDateFromBudget(course, doneIds, cards, budget, startDayKey, config),
      totalNewLessonsAtStart: totalNew,
      pausedAt: null,
      frozenDays: [],
    };
  }
  return {
    mode: 'customDate',
    presetId: null,
    dailyTimeBudgetMin: deriveBudgetFromDate(course, doneIds, cards, intent.targetDayKey, startDayKey, config),
    hardCapMin,
    startDayKey,
    targetDayKey: intent.targetDayKey,
    totalNewLessonsAtStart: totalNew,
    pausedAt: null,
    frozenDays: [],
  };
}

export interface CustomDateCheck {
  ok: boolean;
  requiredBudget: number;
  suggestedDayKey?: DayKey; // earliest comfortable date at hardCapMin
}

/** Warn (never block) when a custom date needs more than the hard daily cap. */
export function validateCustomDate(
  course: Course,
  cards: SrsCard[],
  doneIds: ReadonlySet<string>,
  targetDayKey: DayKey,
  startDayKey: DayKey,
  hardCapMin: number,
  config: PaceConfig = DEFAULT_CONFIG,
): CustomDateCheck {
  const requiredBudget = deriveBudgetFromDate(course, doneIds, cards, targetDayKey, startDayKey, config);
  if (requiredBudget <= hardCapMin) return { ok: true, requiredBudget };
  return {
    ok: false,
    requiredBudget,
    suggestedDayKey: deriveDateFromBudget(course, doneIds, cards, hardCapMin, startDayKey, config),
  };
}
