import { describe, it, expect } from 'vitest';
import type { Course, Lesson, SrsCard } from './types';
import { DEFAULT_CONFIG } from './config';
import {
  buildPlan,
  deriveBudgetFromDate,
  deriveDateFromBudget,
  validateCustomDate,
} from './planner';
import { addDays, daysBetween, parseDayKey } from './time';

const START = '2026-06-01';
const NONE: SrsCard[] = [];
const noDone = new Set<string>();

// 10 lessons, 6 min each, linear, no vocab => zero review load => deterministic dates.
const lesson = (i: number): Lesson => ({
  id: `l${i}`,
  moduleId: 'm',
  order: i,
  estMinutes: 6,
  prereqIds: i === 0 ? [] : [`l${i - 1}`],
  introducesVocab: [],
});
const course: Course = { lessons: Array.from({ length: 10 }, (_, i) => lesson(i)) };

describe('deriveDateFromBudget', () => {
  it('budget for 2 lessons/day finishes 10 lessons in 5 days', () => {
    // 12 min/day => floor(12/6)=2 lessons/day => 5 active days => finish index 4
    expect(deriveDateFromBudget(course, noDone, NONE, 12, START)).toBe(addDays(START, 4));
  });
  it('budget for 1 lesson/day finishes in 10 days', () => {
    expect(deriveDateFromBudget(course, noDone, NONE, 6, START)).toBe(addDays(START, 9));
  });
  it('a huge budget finishes the same day', () => {
    expect(deriveDateFromBudget(course, noDone, NONE, 600, START)).toBe(START);
  });
  it('is monotonic — more budget never finishes later', () => {
    let prev = Infinity;
    for (const b of [6, 12, 18, 24, 60]) {
      const fin = parseDayKey(deriveDateFromBudget(course, noDone, NONE, b, START));
      expect(fin).toBeLessThanOrEqual(prev);
      prev = fin;
    }
  });
});

describe('deriveBudgetFromDate (monotonic, smallest sufficient)', () => {
  it('finds the smallest budget that hits the target', () => {
    const target = addDays(START, 4); // 5 days => need 2 lessons/day => 12 min
    expect(deriveBudgetFromDate(course, noDone, NONE, target, START)).toBe(12);
  });
  it('a looser date needs less budget', () => {
    const target = addDays(START, 9); // 10 days => 1 lesson/day => 6 min
    expect(deriveBudgetFromDate(course, noDone, NONE, target, START)).toBe(6);
  });
});

describe('validateCustomDate', () => {
  it('passes when the required budget is under the hard cap', () => {
    const v = validateCustomDate(course, NONE, noDone, addDays(START, 9), START, 60);
    expect(v.ok).toBe(true);
    expect(v.requiredBudget).toBe(6);
  });
  it('warns + suggests an earliest comfortable date when too aggressive', () => {
    // finish today => need all 10 in 1 day => 60 min; cap 30 => not ok
    const v = validateCustomDate(course, NONE, noDone, START, START, 30);
    expect(v.ok).toBe(false);
    expect(v.requiredBudget).toBe(60);
    // 30 min/day => 5 lessons/day => 2 days => start+1
    expect(v.suggestedDayKey).toBe(addDays(START, 1));
  });
});

describe('buildPlan', () => {
  it('preset fixes budget and derives the date', () => {
    const plan = buildPlan(course, NONE, noDone, START, { kind: 'preset', presetId: 'steady' });
    expect(plan.mode).toBe('preset');
    expect(plan.dailyTimeBudgetMin).toBe(20); // steady
    expect(plan.totalNewLessonsAtStart).toBe(10);
    expect(daysBetween(START, plan.targetDayKey)).toBeGreaterThanOrEqual(0);
  });
  it('custom date derives the required budget', () => {
    const target = addDays(START, 4);
    const plan = buildPlan(course, NONE, noDone, START, { kind: 'customDate', targetDayKey: target });
    expect(plan.mode).toBe('customDate');
    expect(plan.targetDayKey).toBe(target);
    expect(plan.dailyTimeBudgetMin).toBe(12);
  });
  it('uses DEFAULT_CONFIG when none passed', () => {
    expect(DEFAULT_CONFIG.reviewMinPerCard).toBeGreaterThan(0);
  });
});
