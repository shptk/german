import { describe, it, expect } from 'vitest';
import type { ReviewTelemetry, SrsCard } from './types';
import {
  EF_FLOOR,
  EF_START,
  capGrade,
  deriveGrade,
  enterDeck,
  gradeToSm2,
  newCard,
  reviewCard,
} from './srs';

const TODAY = '2026-06-22';
const tele = (over: Partial<ReviewTelemetry> = {}): ReviewTelemetry => ({
  attempts: 1,
  usedHint: false,
  ms: 1000,
  expectedMs: 2500,
  recognition: false,
  ...over,
});

describe('newCard + enterDeck', () => {
  it('creates a new card with defaults', () => {
    const c = newCard('a1.v.vater', 1000);
    expect(c).toMatchObject({
      id: 'a1.v.vater',
      kind: 'vocab',
      easiness: EF_START,
      intervalDays: 0,
      repetitions: 0,
      lapses: 0,
      dueDayKey: null,
      state: 'new',
      updatedAt: 1000,
    });
  });

  it('enters the deck due TOMORROW (no same-day double-count)', () => {
    const c = enterDeck(newCard('a1.v.vater', 0), TODAY, 2000);
    expect(c.state).toBe('learning');
    expect(c.introducedDayKey).toBe(TODAY);
    expect(c.dueDayKey).toBe('2026-06-23');
    expect(c.intervalDays).toBe(0);
    expect(c.updatedAt).toBe(2000);
  });

  it('is idempotent on an already-introduced card', () => {
    const once = enterDeck(newCard('a1.v.vater', 0), TODAY, 1);
    const twice = enterDeck(once, '2026-07-01', 2);
    expect(twice).toBe(once); // unchanged reference
  });
});

describe('reviewCard SM-2 success ladder', () => {
  it('walks 1 -> 6 -> round(interval*EF) and advances due dates', () => {
    const c0 = enterDeck(newCard('a', 0), TODAY, 0);

    const r1 = reviewCard(c0, gradeToSm2('good'), '2026-06-23', 100);
    expect(r1).toMatchObject({ repetitions: 1, intervalDays: 1, state: 'review', dueDayKey: '2026-06-24' });
    expect(r1.easiness).toBeCloseTo(2.5, 5); // grade 4 => EF unchanged

    const r2 = reviewCard(r1, gradeToSm2('good'), '2026-06-24', 200);
    expect(r2).toMatchObject({ repetitions: 2, intervalDays: 6, dueDayKey: '2026-06-30' });

    const r3 = reviewCard(r2, gradeToSm2('good'), '2026-06-30', 300);
    expect(r3.intervalDays).toBe(15); // round(6 * 2.5)
    expect(r3.repetitions).toBe(3);
    expect(r3.dueDayKey).toBe('2026-07-15');
  });

  it("'easy' raises easiness by 0.1", () => {
    const c0 = enterDeck(newCard('a', 0), TODAY, 0);
    const r = reviewCard(c0, gradeToSm2('easy'), '2026-06-23', 1);
    expect(r.easiness).toBeCloseTo(2.6, 5);
  });
});

describe('reviewCard lapses', () => {
  it('resets reps/interval, increments lapses, lowers EF', () => {
    const c0 = enterDeck(newCard('a', 0), TODAY, 0);
    const mature = reviewCard(reviewCard(c0, 4, '2026-06-23', 1), 4, '2026-06-24', 2); // state 'review'
    const lapsed = reviewCard(mature, gradeToSm2('again'), '2026-06-30', 3);
    expect(lapsed.state).toBe('learning');
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.intervalDays).toBe(1);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.easiness).toBeCloseTo(mature.easiness - 0.54, 5);
    expect(lapsed.dueDayKey).toBe('2026-07-01');
  });

  it('floors easiness at 1.3 under repeated failure', () => {
    let c: SrsCard = reviewCard(enterDeck(newCard('a', 0), TODAY, 0), 4, '2026-06-23', 1);
    for (let i = 0; i < 6; i++) c = reviewCard(c, 1, '2026-07-01', i);
    expect(c.easiness).toBe(EF_FLOOR);
    expect(c.easiness).toBeGreaterThanOrEqual(EF_FLOOR);
  });
});

describe('overdue bonus', () => {
  it('uses max(intervalDays, daysLate) for a mature success', () => {
    const mature: SrsCard = {
      ...newCard('a', 0),
      state: 'review',
      repetitions: 3,
      intervalDays: 5,
      easiness: 2.0,
      dueDayKey: '2026-06-10',
    };
    const r = reviewCard(mature, 4, '2026-06-25', 1); // 15 days late
    expect(r.intervalDays).toBe(30); // round(max(5,15) * 2.0), NOT round(5*2.0)=10
  });
});

describe('deriveGrade (inferred, no self-rating)', () => {
  it('maps wrong -> again regardless of telemetry', () => {
    expect(deriveGrade(false, tele({ attempts: 1 }))).toBe('again');
  });

  it('fast, first-try, recall -> easy', () => {
    expect(deriveGrade(true, tele({ ms: 800, recognition: false }))).toBe('easy');
  });

  it('recognition (pick/MCQ) caps at good', () => {
    expect(deriveGrade(true, tele({ recognition: true }))).toBe('good');
  });

  it('hint or retry -> hard', () => {
    expect(deriveGrade(true, tele({ usedHint: true }))).toBe('hard');
    expect(deriveGrade(true, tele({ attempts: 2 }))).toBe('hard');
  });

  it('slow (>2x expected) -> good', () => {
    expect(deriveGrade(true, tele({ ms: 6000, expectedMs: 2500 }))).toBe('good');
  });

  it('respects a per-type ceiling', () => {
    expect(deriveGrade(true, tele({ ms: 800 }), 'good')).toBe('good'); // easy clamped down
  });
});

describe('capGrade + gradeToSm2', () => {
  it('clamps down, never up', () => {
    expect(capGrade('easy', 'good')).toBe('good');
    expect(capGrade('hard', 'good')).toBe('hard');
    expect(capGrade('again', 'good')).toBe('again');
  });

  it('maps the 4 grades to SM-2 numerics', () => {
    expect(gradeToSm2('again')).toBe(1);
    expect(gradeToSm2('hard')).toBe(3);
    expect(gradeToSm2('good')).toBe(4);
    expect(gradeToSm2('easy')).toBe(5);
  });
});
