import { describe, it, expect } from 'vitest';
import {
  addDays,
  daysBetween,
  compareDayKeys,
  isOnOrBefore,
  maxDayKey,
  minDayKey,
  parseDayKey,
  toDayKey,
} from './time';

describe('day-key arithmetic', () => {
  it('adds days within a month', () => {
    expect(addDays('2026-06-22', 1)).toBe('2026-06-23');
    expect(addDays('2026-06-22', 10)).toBe('2026-07-02');
  });

  it('crosses month and year boundaries', () => {
    expect(addDays('2026-06-30', 1)).toBe('2026-07-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('handles leap years', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29'); // 2024 is a leap year
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01'); // 2026 is not
  });

  it('computes signed distance', () => {
    expect(daysBetween('2026-06-22', '2026-06-25')).toBe(3);
    expect(daysBetween('2026-06-25', '2026-06-22')).toBe(-3);
    expect(daysBetween('2026-06-22', '2026-06-22')).toBe(0);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
  });

  it('is immune to DST (pure UTC label math)', () => {
    // A spring-forward span in many zones; UTC math must still be exactly 1.
    expect(daysBetween('2026-03-28', '2026-03-29')).toBe(1);
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
  });

  it('compares and bounds', () => {
    expect(compareDayKeys('2026-06-22', '2026-06-23')).toBe(-1);
    expect(compareDayKeys('2026-06-23', '2026-06-22')).toBe(1);
    expect(compareDayKeys('2026-06-22', '2026-06-22')).toBe(0);
    expect(isOnOrBefore('2026-06-22', '2026-06-22')).toBe(true);
    expect(isOnOrBefore('2026-06-23', '2026-06-22')).toBe(false);
    expect(maxDayKey('2026-06-22', '2026-06-25')).toBe('2026-06-25');
    expect(minDayKey('2026-06-22', '2026-06-25')).toBe('2026-06-22');
  });

  it('round-trips parse/format', () => {
    expect(toDayKey(parseDayKey('2026-06-22'))).toBe('2026-06-22');
  });

  it('rejects malformed keys', () => {
    expect(() => parseDayKey('2026/06/22')).toThrow();
    expect(() => parseDayKey('nope')).toThrow();
  });
});
