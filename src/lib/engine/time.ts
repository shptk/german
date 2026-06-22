/*
 * Pure day-key arithmetic on 'YYYY-MM-DD' strings.
 *
 * All math is done in UTC midnight so it is immune to DST and timezones — a
 * "day" is a calendar label, not an instant. The engine never reads the wall
 * clock (no Date.now / argless `new Date()`); callers inject the current
 * `todayKey`. `new Date(utcMs)` / `Date.UTC(...)` are explicit-argument and pure.
 */

import type { DayKey } from './types';

/** Parse a 'YYYY-MM-DD' day key to UTC-midnight epoch ms. */
export function parseDayKey(key: DayKey): number {
  const parts = key.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (parts.length !== 3 || !Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new RangeError(`invalid DayKey: ${key}`);
  }
  return Date.UTC(y, m - 1, d);
}

/** Format a UTC-midnight epoch ms back to a 'YYYY-MM-DD' day key. */
export function toDayKey(utcMs: number): DayKey {
  const dt = new Date(utcMs);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DAY_MS = 86_400_000;

/** A day key `n` days after `key` (negative `n` goes backward). */
export function addDays(key: DayKey, n: number): DayKey {
  return toDayKey(parseDayKey(key) + n * DAY_MS);
}

/** Signed whole-day distance: `b - a` (positive when `b` is later). */
export function daysBetween(a: DayKey, b: DayKey): number {
  return Math.round((parseDayKey(b) - parseDayKey(a)) / DAY_MS);
}

/** -1 if a<b, 0 if equal, 1 if a>b. */
export function compareDayKeys(a: DayKey, b: DayKey): -1 | 0 | 1 {
  const d = parseDayKey(a) - parseDayKey(b);
  return d < 0 ? -1 : d > 0 ? 1 : 0;
}

/** True when `key` is on or before `ref` (i.e. due). */
export function isOnOrBefore(key: DayKey, ref: DayKey): boolean {
  return parseDayKey(key) <= parseDayKey(ref);
}

export function maxDayKey(a: DayKey, b: DayKey): DayKey {
  return compareDayKeys(a, b) >= 0 ? a : b;
}

export function minDayKey(a: DayKey, b: DayKey): DayKey {
  return compareDayKeys(a, b) <= 0 ? a : b;
}
