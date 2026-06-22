import { describe, it, expect } from 'vitest';
import type { Course, Lesson, PacePlan } from './types';
import { activeDaysBetween, isBehind, paceStatus } from './pace';
import { addDays } from './time';

const START = '2026-06-01';
const lesson = (i: number): Lesson => ({ id: `l${i}`, moduleId: 'm', order: i, estMinutes: 6, prereqIds: [], introducesVocab: [] });
const course: Course = { lessons: Array.from({ length: 10 }, (_, i) => lesson(i)) };
const doneSet = (n: number) => new Set(Array.from({ length: n }, (_, i) => `l${i}`));

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

describe('activeDaysBetween', () => {
  it('counts calendar days minus frozen days', () => {
    expect(activeDaysBetween(plan(), START, addDays(START, 5))).toBe(5);
    expect(activeDaysBetween(plan({ frozenDays: [addDays(START, 2)] }), START, addDays(START, 5))).toBe(4);
    expect(activeDaysBetween(plan(), addDays(START, 5), START)).toBe(0);
  });
});

describe('paceStatus', () => {
  it('is on-track at the start with nothing done', () => {
    expect(paceStatus(plan(), course, new Set(), START).kind).toBe('onTrack');
  });
  it('is ahead when done outpaces the ideal curve', () => {
    expect(paceStatus(plan(), course, doneSet(5), addDays(START, 1)).kind).toBe('ahead');
  });
  it('is behind when done trails the curve', () => {
    expect(paceStatus(plan(), course, doneSet(2), addDays(START, 8)).kind).toBe('behind');
  });
  it('is done when no lessons remain', () => {
    expect(paceStatus(plan(), course, doneSet(10), addDays(START, 3)).kind).toBe('done');
  });
  it('is paused when the plan is paused', () => {
    expect(paceStatus(plan({ pausedAt: addDays(START, 3) }), course, doneSet(2), addDays(START, 3)).kind).toBe('paused');
  });
  it('is elapsed when the target passed with lessons left (fix #2)', () => {
    expect(paceStatus(plan(), course, doneSet(2), addDays(START, 12)).kind).toBe('elapsed');
  });
});

describe('isBehind', () => {
  it('is true for behind and elapsed, false otherwise', () => {
    expect(isBehind(plan(), course, doneSet(2), addDays(START, 8))).toBe(true);
    expect(isBehind(plan(), course, doneSet(2), addDays(START, 12))).toBe(true);
    expect(isBehind(plan(), course, new Set(), START)).toBe(false);
  });
});
