/*
 * Forward-only AppState migrations (DESIGN §4.3). Each step bumps `version` by
 * one. These run on imported backups and (later) synced blobs that may predate
 * the current shape — so they must be pure and total.
 */

import { APP_STATE_VERSION } from './types';

type AnyState = Record<string, unknown> & { version?: number };

export const STATE_MIGRATIONS: Record<number, (s: AnyState) => AnyState> = {
  // 0 -> 1: pre-release states lacked dayLog / streak; backfill them.
  0: (s) => ({
    ...s,
    version: 1,
    dayLog: (s.dayLog as unknown) ?? {},
    streak: (s.streak as unknown) ?? { current: 0, longest: 0, lastActiveDayKey: null },
  }),
};

/** Walk a raw state up to APP_STATE_VERSION. Throws if a step is missing. */
export function migrateState(raw: AnyState): AnyState {
  let s = raw;
  let guard = 0;
  while ((s.version ?? 0) < APP_STATE_VERSION) {
    const from = s.version ?? 0;
    const step = STATE_MIGRATIONS[from];
    if (!step) throw new Error(`no migration path from AppState version ${from}`);
    s = step(s);
    if (++guard > 100) throw new Error('migration loop guard tripped');
  }
  return s;
}
