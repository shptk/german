/*
 * Versioned, checksummed backup envelope + import flow (DESIGN §4.4).
 * Import: parse -> magic check -> checksum (warn on mismatch) -> migrate ->
 * validate -> merge/replace. `replace` warns if the backup is older than current.
 */

import { checksumOf } from './checksum';
import { mergeStates } from './merge';
import { migrateState } from './migrations';
import { validateAppState } from './validate';
import { BACKUP_FORMAT_VERSION, type AppState, type BackupFile, type ImportResult } from './types';

const BUILD = '0.1.0';

export function toBackup(state: AppState, exportedAt: string): BackupFile {
  return {
    format: 'german-a1-backup',
    backupVersion: BACKUP_FORMAT_VERSION,
    exportedAt,
    app: { name: 'German A1', build: BUILD },
    state,
    checksum: { algo: 'fnv1a-32', value: checksumOf(state) },
  };
}

export interface ParsedBackup {
  state: AppState;
  checksumOk: boolean;
  migratedFrom: number;
  warnings: string[];
}

export function parseBackup(raw: unknown): ParsedBackup {
  if (!raw || typeof raw !== 'object') throw new Error('not a backup file');
  const f = raw as Partial<BackupFile>;
  if (f.format !== 'german-a1-backup') throw new Error('not a German A1 backup (bad magic)');
  if (!f.state || typeof f.state !== 'object') throw new Error('backup has no state');

  const rawState = f.state as { version?: number };
  const migratedFrom = rawState.version ?? 0;
  const warnings: string[] = [];
  const checksumOk = f.checksum?.value === checksumOf(rawState);
  if (!checksumOk) warnings.push('checksum mismatch — the backup may be corrupted or hand-edited');

  const state = validateAppState(migrateState(rawState as Record<string, unknown>));
  return { state, checksumOk, migratedFrom, warnings };
}

/** Apply a parsed backup to current state per strategy; returns the new state + report. */
export function applyBackup(
  raw: unknown,
  current: AppState,
  strategy: 'replace' | 'merge',
): { state: AppState; result: ImportResult } {
  const parsed = parseBackup(raw);
  const warnings = [...parsed.warnings];
  let state: AppState;
  if (strategy === 'replace') {
    if (parsed.state.updatedAt < current.updatedAt) {
      warnings.push('this backup is OLDER than your current data; replacing discards newer progress');
    }
    state = parsed.state;
  } else {
    state = mergeStates(current, parsed.state);
  }
  return {
    state,
    result: { ok: true, strategy, checksumOk: parsed.checksumOk, migratedFrom: parsed.migratedFrom, warnings },
  };
}
