/*
 * Tunable pace constants. In production these self-calibrate from the dayLog
 * (EMA of actual minutes/card and observed pass rate); here they are sensible
 * defaults. (DESIGN.md §5.6.)
 */

import type { PaceConfig, PresetId } from './types';

/** Intensity preset -> daily time budget (minutes). A preset just fixes the budget. */
export const PRESETS: Record<PresetId, number> = {
  relaxed: 10,
  steady: 20,
  intense: 35,
};

export const DEFAULT_CONFIG: PaceConfig = {
  reviewMinPerCard: 0.25, // ~15s/card
  defaultLessonMin: 6,
  maxReviewMin: 25, // per-day review cap; overflow rolls forward
  spreadTolerance: 1.15, // keep the date if a respread stays within +15% of budget
  recapFraction: 0.5, // a recap may fill up to half the daily budget
  assumedPassRate: 0.85,
};
