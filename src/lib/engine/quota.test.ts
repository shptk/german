import { describe, it, expect } from 'vitest';
import type { Course, Lesson, PaceConfig, PacePlan, SrsCard } from './types';
import { effectiveDailyBudget, recommendToday } from './quota';
import { addDays } from './time';

const START = '2026-06-01';

const lesson = (i: number): Lesson => ({
  id: `l${i}`,
  moduleId: 'm',
  order: i,
  estMinutes: 6,
  prereqIds: i === 0 ? [] : [`l${i - 1}`],
  introducesVocab: [],
});
const course: Course = { lessons: Array.from({ length: 10 }, (_, i) => lesson(i)) };

const plan = (over: Partial<PacePlan> = {}): PacePlan => ({
  mode: 'preset',
  presetId: 'steady',
  dailyTimeBudgetMin: 12,
  hardCapMin: 60,
  startDayKey: START,
  targetDayKey: addDays(START, 9),
  totalNewLessonsAtStart: 10,
  pausedAt: null,
  frozenDays: [],
  ...over,
});

const card = (id: string, dueDayKey: string): SrsCard => ({
  id,
  kind: 'vocab',
  easiness: 2.5,
  intervalDays: 1,
  repetitions: 1,
  lapses: 0,
  dueDayKey,
  state: 'review',
  introducedDayKey: START,
  lastReviewedDayKey: null,
  lastGrade: null,
  totalReviews: 1,
  suspended: false,
  updatedAt: 0,
});

const capCfg: PaceConfig = {
  reviewMinPerCard: 1,
  defaultLessonMin: 6,
  maxReviewMin: 3, // => max 3 reviews/day
  spreadTolerance: 1.15,
  recapFraction: 0.5,
  assumedPassRate: 0.85,
};

describe('recommendToday — reviews', () => {
  it('caps reviews and rolls overflow forward (most-overdue first)', () => {
    const cards = [-4, -3, -2, -1, 0].map((d) => card(`c${d}`, addDays(START, d)));
    const q = recommendToday({ plan: plan(), cards, course, done: new Set(), todayKey: START, nowMs: 777, config: capCfg });
    expect(q.reviews.map((c) => c.id)).toEqual(['c-4', 'c-3', 'c-2']); // 3 most overdue
    expect(q.deferredReviews.map((c) => c.id)).toEqual(['c-1', 'c0']);
    expect(q.deferredReviews[0].dueDayKey).toBe(addDays(START, 1)); // pushed to tomorrow, never dropped
    expect(q.deferredReviews[0].updatedAt).toBe(777);
  });

  it('returns all due when under the cap', () => {
    const cards = [card('a', START)];
    const q = recommendToday({ plan: plan(), cards, course, done: new Set(), todayKey: START, nowMs: 1, config: capCfg });
    expect(q.reviews).toHaveLength(1);
    expect(q.deferredReviews).toHaveLength(0);
  });

  it('drops deprecated-content cards (fix #13)', () => {
    const cards = [card('keep', START), card('dead', START)];
    const q = recommendToday({
      plan: plan(),
      cards,
      course,
      done: new Set(),
      todayKey: START,
      nowMs: 1,
      isDeprecated: (id) => id === 'dead',
    });
    expect(q.reviews.map((c) => c.id)).toEqual(['keep']);
  });
});

describe('recommendToday — new lessons (smoothing + nudge)', () => {
  it('smooths to the ideal/day even when more would fit the budget', () => {
    // budget 12 fits 2 lessons, but 10 lessons / 9 days ~= 1/day
    const q = recommendToday({ plan: plan(), cards: [], course, done: new Set(), todayKey: START, nowMs: 1 });
    expect(q.newLessons).toHaveLength(1);
  });

  it('recommends 0 when far ahead-of-curve capacity rounds to 0 and not behind', () => {
    const p = plan({ targetDayKey: addDays(START, 100) });
    const q = recommendToday({ plan: p, cards: [], course, done: new Set(), todayKey: START, nowMs: 1 });
    expect(q.newLessons).toHaveLength(0);
  });

  it('nudges to 1 when behind and the day has capacity', () => {
    const p = plan({ targetDayKey: addDays(START, 100), totalNewLessonsAtStart: 10 });
    const q = recommendToday({ plan: p, cards: [], course, done: new Set(), todayKey: addDays(START, 20), nowMs: 1 });
    expect(q.newLessons).toHaveLength(1);
  });
});

describe('recommendToday — paused / frozen', () => {
  it('recommends nothing when paused', () => {
    const q = recommendToday({ plan: plan({ pausedAt: START }), cards: [card('a', START)], course, done: new Set(), todayKey: START, nowMs: 1 });
    expect(q).toMatchObject({ reviews: [], deferredReviews: [], newLessons: [], estMin: 0 });
  });
  it('recommends nothing on a frozen day', () => {
    const q = recommendToday({ plan: plan({ frozenDays: [START] }), cards: [card('a', START)], course, done: new Set(), todayKey: START, nowMs: 1 });
    expect(q.reviews).toHaveLength(0);
    expect(q.newLessons).toHaveLength(0);
  });
  it('effectiveDailyBudget reflects pause/freeze', () => {
    expect(effectiveDailyBudget(plan(), START)).toBe(12);
    expect(effectiveDailyBudget(plan({ pausedAt: START }), START)).toBe(0);
    expect(effectiveDailyBudget(plan({ frozenDays: [START] }), START)).toBe(0);
  });
});
