/*
 * Project how many SRS reviews come due on each of the next N days, by
 * simulating the current deck forward under optimistic-but-discounted growth.
 * Used to SMOOTH new-lesson allocation so total time/day stays ~flat as review
 * load grows — it never suppresses a genuinely-due review. (DESIGN §5.2.)
 */

import type { PaceConfig, SrsCard } from './types';
import { addDays, parseDayKey } from './time';

interface SimCard {
  due: number; // parsed day ms
  interval: number;
  ef: number;
}

/** Next interval under assumed pass, discounted by pass rate (failures keep cards in rotation). */
export function projectNextInterval(interval: number, ef: number, passRate: number): number {
  return Math.max(1, Math.round(Math.max(interval, 1) * ef * passRate));
}

/** Review COUNTS per day for the next `days` days (index 0 = today). */
export function forecastReviewsPerDay(
  cards: SrsCard[],
  todayKey: string,
  days: number,
  config: PaceConfig,
): number[] {
  const sim: SimCard[] = cards
    .filter((c) => !c.suspended && c.state !== 'new' && c.dueDayKey != null)
    .map((c) => ({ due: parseDayKey(c.dueDayKey as string), interval: c.intervalDays, ef: c.easiness }));

  const counts = new Array<number>(Math.max(0, days)).fill(0);
  for (let i = 0; i < days; i++) {
    const dayMs = parseDayKey(addDays(todayKey, i));
    for (const c of sim) {
      if (c.due <= dayMs) {
        counts[i] += 1;
        c.interval = projectNextInterval(c.interval, c.ef, config.assumedPassRate);
        c.due = parseDayKey(addDays(todayKey, i + c.interval));
      }
    }
  }
  return counts;
}

/** Forecast review MINUTES per day (counts × per-card minutes). */
export function forecastReviewMinutes(
  cards: SrsCard[],
  todayKey: string,
  days: number,
  config: PaceConfig,
): number[] {
  return forecastReviewsPerDay(cards, todayKey, days, config).map((n) => n * config.reviewMinPerCard);
}
