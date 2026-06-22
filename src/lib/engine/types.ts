/*
 * Core engine types — level-agnostic. Nothing here references A1 specifically;
 * A2/B1 reuse the same shapes. (See DESIGN.md §2.6 / §5.)
 */

/** A calendar day in the learner's LOCAL zone, formatted 'YYYY-MM-DD'. */
export type DayKey = string;

/** Inferred review grade at the UX level (never asked of the user directly). */
export type Grade = 'again' | 'hard' | 'good' | 'easy';

export type SrsState = 'new' | 'learning' | 'review';

/** One SM-2 card == one vocab atom. Persisted; keyed by content id only. */
export interface SrsCard {
  id: string; // == vocab content id
  kind: 'vocab';
  easiness: number; // EF; start 2.5, floor 1.3
  intervalDays: number; // 0 = new / never-passed
  repetitions: number; // consecutive successes (grade >= 3); resets on lapse
  lapses: number; // graduated-card fallbacks (leech detection)
  dueDayKey: DayKey | null;
  state: SrsState;
  introducedDayKey: DayKey | null; // when its lesson was completed
  lastReviewedDayKey: DayKey | null;
  lastGrade: number | null; // SM-2 numeric of the last review
  totalReviews: number;
  suspended: boolean; // learner-only; excluded from due/forecast
  updatedAt: number; // epoch ms — sync tie-breaker (injected, never Date.now in engine)
}

/**
 * Deterministic signals the session runner feeds `deriveGrade`. No self-rating:
 * the grade is inferred from correctness + first-try + latency + hint use.
 */
export interface ReviewTelemetry {
  attempts: number; // 1 = first try
  usedHint: boolean;
  ms: number; // first-interaction -> commit (reading time excluded)
  expectedMs: number; // per-type expectation
  recognition: boolean; // pick-mode / MCQ — has a guess floor
}
