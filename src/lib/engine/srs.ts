/*
 * SM-2 spaced repetition (pure). See DESIGN.md §5.1.
 *
 * - One card == one vocab atom.
 * - A new card ENTERS the deck on lesson completion, first review TOMORROW
 *   (todayKey + 1) — it was just drilled inside the lesson, so reviewing it
 *   again the same day both double-counts time and is redundant.
 * - The UX never asks "how well did you know it?". `deriveGrade` infers a
 *   4-level grade from deterministic signals; `gradeToSm2` maps it to the
 *   0–5 number the math uses. Per-type guess-floors are applied via a ceiling.
 * - `updatedAt` / "now" is injected (nowMs) — the engine never reads the clock.
 */

import type { DayKey, Grade, ReviewTelemetry, SrsCard } from './types';
import { addDays, daysBetween } from './time';

export const EF_START = 2.5;
export const EF_FLOOR = 1.3;

const GRADE_ORDER: readonly Grade[] = ['again', 'hard', 'good', 'easy'];

/** A brand-new, never-seen card. */
export function newCard(id: string, nowMs: number): SrsCard {
  return {
    id,
    kind: 'vocab',
    easiness: EF_START,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    dueDayKey: null,
    state: 'new',
    introducedDayKey: null,
    lastReviewedDayKey: null,
    lastGrade: null,
    totalReviews: 0,
    suspended: false,
    updatedAt: nowMs,
  };
}

/** Lesson completion introduces a card: learning, first review tomorrow. Idempotent on non-new. */
export function enterDeck(card: SrsCard, todayKey: DayKey, nowMs: number): SrsCard {
  if (card.state !== 'new') return card;
  return {
    ...card,
    state: 'learning',
    introducedDayKey: todayKey,
    repetitions: 0,
    intervalDays: 0,
    dueDayKey: addDays(todayKey, 1),
    updatedAt: nowMs,
  };
}

/** Clamp a grade down to a per-exercise-type ceiling (e.g. MCQ/gender-tap cap at 'good'). */
export function capGrade(g: Grade, ceiling: Grade): Grade {
  return GRADE_ORDER.indexOf(g) <= GRADE_ORDER.indexOf(ceiling) ? g : ceiling;
}

/** Infer the UX grade from deterministic signals, capped at the type ceiling. */
export function deriveGrade(
  correct: boolean,
  t: ReviewTelemetry,
  ceiling: Grade = 'easy',
): Grade {
  if (!correct) return 'again';
  let g: Grade;
  if (t.usedHint || t.attempts > 1) g = 'hard';
  else if (t.recognition || t.ms > 2 * t.expectedMs) g = 'good';
  else g = 'easy';
  return capGrade(g, ceiling);
}

/** UX grade -> SM-2 numeric. */
export function gradeToSm2(g: Grade): number {
  switch (g) {
    case 'again':
      return 1;
    case 'hard':
      return 3;
    case 'good':
      return 4;
    case 'easy':
      return 5;
  }
}

/**
 * Apply one review. `grade` is the SM-2 numeric (0–5). Pure: returns a new card.
 * Mature successes get an OVERDUE BONUS — a card remembered after a long gap
 * earns a longer next interval (base = max(intervalDays, daysLate)).
 */
export function reviewCard(card: SrsCard, grade: number, todayKey: DayKey, nowMs: number): SrsCard {
  const c: SrsCard = { ...card };
  c.totalReviews += 1;
  c.lastReviewedDayKey = todayKey;
  c.lastGrade = grade;

  if (grade >= 3) {
    if (c.repetitions === 0) {
      c.intervalDays = 1;
    } else if (c.repetitions === 1) {
      c.intervalDays = 6;
    } else {
      const daysLate = c.dueDayKey ? Math.max(0, daysBetween(c.dueDayKey, todayKey)) : 0;
      const base = Math.max(c.intervalDays, daysLate); // overdue bonus
      c.intervalDays = Math.round(base * c.easiness);
    }
    c.repetitions += 1;
    c.state = 'review';
  } else {
    if (c.state === 'review') c.lapses += 1; // count only graduated-card fallbacks
    c.repetitions = 0;
    c.intervalDays = 1;
    c.state = 'learning';
  }

  // Classic SM-2 easiness update, every review; floored at 1.3.
  c.easiness += 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02);
  if (c.easiness < EF_FLOOR) c.easiness = EF_FLOOR;

  c.dueDayKey = addDays(todayKey, c.intervalDays);
  c.updatedAt = nowMs;
  return c;
}
