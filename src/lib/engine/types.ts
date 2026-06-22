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

/* ---- Pace / planning (level-agnostic) ---- */

/** A lesson as the pace engine sees it (the engine ignores exercise bodies). */
export interface Lesson {
  id: string;
  moduleId: string;
  order: number; // global ordering across the course
  estMinutes: number;
  prereqIds: string[];
  introducesVocab: string[]; // cards that enter the deck on completion
}

/** The whole level the engine plans over. Lessons may be in any order; the engine topo-sorts. */
export interface Course {
  lessons: Lesson[];
}

export type PresetId = 'relaxed' | 'steady' | 'intense';

/** How the learner set their goal (one engine path for both). */
export type PaceIntent =
  | { kind: 'preset'; presetId: PresetId }
  | { kind: 'customDate'; targetDayKey: DayKey };

/** The single persisted pace record. Pace intent lives ONLY here (fix #10). */
export interface PacePlan {
  mode: 'preset' | 'customDate';
  presetId: PresetId | null;
  dailyTimeBudgetMin: number; // active per-day cap (preset value OR derived from date)
  hardCapMin: number; // "too aggressive" threshold
  startDayKey: DayKey;
  targetDayKey: DayKey;
  totalNewLessonsAtStart: number; // ideal-curve denominator anchor
  pausedAt: DayKey | null; // non-null => currently paused
  frozenDays: DayKey[]; // sick/pause days excluded from pace + budget
}

/** Streak is a soft commitment device; a missed day never wipes it. */
export interface StreakState {
  current: number;
  longest: number;
  lastActiveDayKey: DayKey | null;
}

/** Tunable constants (self-calibrating in production via dayLog EMA). */
export interface PaceConfig {
  reviewMinPerCard: number;
  defaultLessonMin: number;
  maxReviewMin: number; // per-day review cap (fix #1)
  spreadTolerance: number; // respread vs push threshold multiplier
  recapFraction: number; // share of the budget the recap may fill
  assumedPassRate: number; // SRS forecast optimism
}

/** What `recommendToday` returns — a recommendation layered over free-roam; nothing locks. */
export interface DayQueue {
  reviews: SrsCard[]; // due cards to do today (capped)
  deferredReviews: SrsCard[]; // overflow, due-date bumped to tomorrow (fix #1)
  newLessons: Lesson[]; // recommended new lessons (whole, prereq order)
  estMin: number;
  reviewsHeavy: boolean; // due reviews alone met/exceeded the budget
}

export type PaceStatusKind = 'ahead' | 'onTrack' | 'behind' | 'paused' | 'elapsed' | 'done';

export interface PaceStatus {
  kind: PaceStatusKind;
  lessonsDone: number;
  totalLessons: number;
  remainingLessons: number;
  idealDone: number;
  daysAheadBehind: number; // + ahead, - behind
  targetDayKey: DayKey;
}

/** Smart-auto missed-day decision (presented, never applied silently). */
export interface CatchupDecision {
  kind: 'respread' | 'push' | 'none';
  projectedDailyMin: number; // worst upcoming day if the A1 date is kept
  pushDays?: number; // minimum extension if pushing
  newTargetDayKey?: DayKey;
}

/** Resurfaced material after a gap — shown before the rest of the day. */
export interface Recap {
  missedLessons: Lesson[];
  overdueReviews: SrsCard[];
}
