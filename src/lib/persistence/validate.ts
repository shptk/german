/*
 * Runtime validation of an AppState (untrusted import / synced blob). Mirrors
 * the engine + persistence types; throws a ZodError on a malformed shape.
 */

import { z } from 'zod';
import type { AppState } from './types';

const srsCard = z.object({
  id: z.string(),
  kind: z.literal('vocab'),
  easiness: z.number(),
  intervalDays: z.number(),
  repetitions: z.number(),
  lapses: z.number(),
  dueDayKey: z.string().nullable(),
  state: z.enum(['new', 'learning', 'review']),
  introducedDayKey: z.string().nullable(),
  lastReviewedDayKey: z.string().nullable(),
  lastGrade: z.number().nullable(),
  totalReviews: z.number(),
  suspended: z.boolean(),
  updatedAt: z.number(),
});

const pacePlan = z.object({
  mode: z.enum(['preset', 'customDate']),
  presetId: z.enum(['relaxed', 'steady', 'intense']).nullable(),
  dailyTimeBudgetMin: z.number(),
  hardCapMin: z.number(),
  startDayKey: z.string(),
  targetDayKey: z.string(),
  totalNewLessonsAtStart: z.number(),
  pausedAt: z.string().nullable(),
  frozenDays: z.array(z.string()),
});

const lessonProgress = z.object({
  id: z.string(),
  status: z.enum(['unseen', 'in_progress', 'done']),
  bestScore: z.number(),
  completedAt: z.number().nullable(),
  attempts: z.number(),
  updatedAt: z.number(),
});

const dayLogEntry = z.object({
  dayKey: z.string(),
  recommendedNew: z.number(),
  doneNew: z.number(),
  recommendedReviews: z.number(),
  doneReviews: z.number(),
  estMinPlanned: z.number(),
  actualMinSpent: z.number(),
  updatedAt: z.number(),
});

export const appStateSchema = z.object({
  version: z.number(),
  updatedAt: z.number(),
  deviceId: z.string(),
  progress: z.object({
    lessons: z.record(z.string(), lessonProgress),
    totals: z.object({ lessonsDone: z.number(), exercisesDone: z.number(), vocabSeen: z.number() }),
  }),
  srs: z.object({ algo: z.literal('sm2'), cards: z.record(z.string(), srsCard) }),
  dayLog: z.record(z.string(), dayLogEntry),
  settings: z.object({
    ttsVoiceURI: z.string().nullable(),
    ttsRate: z.number(),
    theme: z.enum(['system', 'light', 'dark']),
    reduceMotion: z.boolean(),
    autoPlayGermanOnReveal: z.boolean(),
  }),
  plan: pacePlan.nullable(),
  streak: z.object({ current: z.number(), longest: z.number(), lastActiveDayKey: z.string().nullable() }),
});

export function validateAppState(raw: unknown): AppState {
  return appStateSchema.parse(raw) as AppState;
}
