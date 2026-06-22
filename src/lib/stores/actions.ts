/*
 * Pure state transitions over an AppState draft (used inside persistence.patch).
 * Kept framework-free so they're unit-testable without the Svelte runtime; the
 * rune store (store.svelte.ts) just wires these to persistence + reactivity.
 */

import {
  buildPlan,
  enterDeck,
  gradeToSm2,
  newCard,
  reviewCard,
  updateStreak,
  type Grade,
  type Lesson,
  type PaceIntent,
  type PacePlan,
} from '$engine/index';
import type { AssembledContent } from '$content/index';
import type { AppState, DayLogEntry } from '$persist/index';

export function doneSet(state: AppState): Set<string> {
  return new Set(
    Object.values(state.progress.lessons)
      .filter((l) => l.status === 'done')
      .map((l) => l.id),
  );
}

const countDone = (d: AppState) => Object.values(d.progress.lessons).filter((l) => l.status === 'done').length;

function emptyDay(dayKey: string, nowMs: number): DayLogEntry {
  return {
    dayKey,
    recommendedNew: 0,
    doneNew: 0,
    recommendedReviews: 0,
    doneReviews: 0,
    estMinPlanned: 0,
    actualMinSpent: 0,
    updatedAt: nowMs,
  };
}

function addDayLog(
  d: AppState,
  dayKey: string,
  inc: { doneNew?: number; doneReviews?: number; minutes?: number },
  nowMs: number,
): void {
  const cur = d.dayLog[dayKey] ?? emptyDay(dayKey, nowMs);
  d.dayLog[dayKey] = {
    ...cur,
    doneNew: cur.doneNew + (inc.doneNew ?? 0),
    doneReviews: cur.doneReviews + (inc.doneReviews ?? 0),
    actualMinSpent: cur.actualMinSpent + (inc.minutes ?? 0),
    updatedAt: nowMs,
  };
}

/** Compute a plan from current content + progress (preset OR custom date). */
export function computePlan(
  content: AssembledContent,
  state: AppState,
  startDayKey: string,
  intent: PaceIntent,
): PacePlan {
  return buildPlan(content.course, Object.values(state.srs.cards), doneSet(state), startDayKey, intent);
}

export function applySetPlan(d: AppState, plan: PacePlan): void {
  d.plan = plan;
}

/** Mark a lesson done, seed its vocab cards into the deck, bump streak + dayLog. */
export function applyLessonCompletion(
  d: AppState,
  lesson: Lesson,
  scorePct: number,
  todayKey: string,
  nowMs: number,
): void {
  const prev = d.progress.lessons[lesson.id];
  d.progress.lessons[lesson.id] = {
    id: lesson.id,
    status: 'done',
    bestScore: Math.max(scorePct, prev?.bestScore ?? 0),
    completedAt: nowMs,
    attempts: (prev?.attempts ?? 0) + 1,
    updatedAt: nowMs,
  };
  for (const vid of lesson.introducesVocab) {
    const card = d.srs.cards[vid] ?? newCard(vid, nowMs);
    d.srs.cards[vid] = enterDeck(card, todayKey, nowMs);
  }
  d.progress.totals.lessonsDone = countDone(d);
  d.progress.totals.vocabSeen = Object.keys(d.srs.cards).length;
  d.streak = updateStreak(d.streak, todayKey);
  addDayLog(d, todayKey, { doneNew: 1, minutes: lesson.estMinutes }, nowMs);
}

/** Apply one SRS review result to a card. */
export function applyReview(d: AppState, cardId: string, grade: Grade, todayKey: string, nowMs: number): void {
  const card = d.srs.cards[cardId];
  if (!card) return;
  d.srs.cards[cardId] = reviewCard(card, gradeToSm2(grade), todayKey, nowMs);
  d.progress.totals.exercisesDone += 1;
  d.streak = updateStreak(d.streak, todayKey);
  addDayLog(d, todayKey, { doneReviews: 1 }, nowMs);
}

/** Pause / resume / reschedule. */
export function applyPause(d: AppState, todayKey: string): void {
  if (d.plan) d.plan = { ...d.plan, pausedAt: todayKey };
}
export function applyResume(d: AppState): void {
  if (d.plan) d.plan = { ...d.plan, pausedAt: null };
}
export function applyReschedule(d: AppState, plan: PacePlan): void {
  d.plan = plan;
}
