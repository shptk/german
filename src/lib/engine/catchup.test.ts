import { describe, it, expect } from 'vitest';
import type { Course, Lesson, PacePlan, SrsCard } from './types';
import { buildRecap, smartCatchup } from './catchup';
import { addDays } from './time';

const START = '2026-06-10'; // "today" after a gap

const lesson = (i: number): Lesson => ({
  id: `l${i}`,
  moduleId: 'm',
  order: i,
  estMinutes: 6,
  prereqIds: i === 0 ? [] : [`l${i - 1}`],
  introducesVocab: [],
});
const course: Course = { lessons: Array.from({ length: 20 }, (_, i) => lesson(i)) };

const plan = (over: Partial<PacePlan> = {}): PacePlan => ({
  mode: 'preset',
  presetId: 'steady',
  dailyTimeBudgetMin: 20,
  hardCapMin: 60,
  startDayKey: '2026-06-01',
  targetDayKey: addDays(START, 40),
  totalNewLessonsAtStart: 20,
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
  introducedDayKey: '2026-06-01',
  lastReviewedDayKey: null,
  lastGrade: null,
  totalReviews: 1,
  suspended: false,
  updatedAt: 0,
});

describe('smartCatchup', () => {
  it('respreads (keeps the date) when the worst day stays within budget×tolerance', () => {
    const d = smartCatchup({ plan: plan({ targetDayKey: addDays(START, 40) }), cards: [], course, done: new Set(), todayKey: START });
    expect(d.kind).toBe('respread');
    expect(d.projectedDailyMin).toBe(6); // ceil(20/40)=1 lesson × 6 min
  });

  it('pushes by the MINIMUM days when cramming would blow the budget', () => {
    const d = smartCatchup({ plan: plan({ targetDayKey: addDays(START, 5) }), cards: [], course, done: new Set(), todayKey: START });
    expect(d.kind).toBe('push');
    expect(d.pushDays).toBe(2); // 5 days needs 4 lessons/day(24min); +2 days => 3/day(18min) ≤ 20
    expect(d.newTargetDayKey).toBe(addDays(addDays(START, 5), 2));
    expect(d.projectedDailyMin).toBe(24);
  });

  it('returns none when nothing remains', () => {
    const done = new Set(course.lessons.map((l) => l.id));
    expect(smartCatchup({ plan: plan(), cards: [], course, done, todayKey: START }).kind).toBe('none');
  });
});

describe('buildRecap', () => {
  it('resurfaces overdue reviews first, then the next lessons, within the recap budget', () => {
    const cards = [-2, -1, 0].map((x) => card(`c${x}`, addDays(START, x)));
    const recap = buildRecap({ plan: plan(), cards, course, done: new Set(), todayKey: START });
    // recap budget = 20 × 0.5 = 10 min; 3 overdue × 0.25 = 0.75, leaving ~9.25 => one 6-min lesson
    expect(recap.overdueReviews.map((c) => c.id)).toEqual(['c-2', 'c-1', 'c0']);
    expect(recap.missedLessons).toHaveLength(1);
    expect(recap.missedLessons[0].id).toBe('l0');
  });
});
