import { newStreak } from '$engine/index';
import { APP_STATE_VERSION, defaultSettings, type AppState } from './types';

/** A fresh, never-used state (no plan yet -> onboarding). */
export function createEmptyState(deviceId: string, nowMs: number): AppState {
  return {
    version: APP_STATE_VERSION,
    updatedAt: nowMs,
    deviceId,
    progress: { lessons: {}, totals: { lessonsDone: 0, exercisesDone: 0, vocabSeen: 0 } },
    srs: { algo: 'sm2', cards: {} },
    dayLog: {},
    settings: defaultSettings(),
    plan: null,
    streak: newStreak(),
  };
}

/** Per-install id; falls back to a timestamp-ish id if crypto is unavailable. */
export function generateDeviceId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'dev-' + Math.abs(Date.now() ^ (Date.now() << 5)).toString(36);
}
