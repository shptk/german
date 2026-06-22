/*
 * The app store (Svelte 5 runes). Owns the single AppState, the loaded content,
 * and the persistence handle. Actions mutate through persistence.patch() (the
 * source of truth) and then update the reactive snapshot. Selectors run engine
 * functions over the current state for the UI to render. (DESIGN §3.4.)
 */

import {
  recommendToday,
  paceStatus,
  smartCatchup,
  buildRecap,
  addDays,
  compareDayKeys,
  lessonsNotDone,
  validateCustomDate,
  type CatchupDecision,
  type CustomDateCheck,
  type DayKey,
  type DayQueue,
  type Grade,
  type PaceIntent,
  type PaceStatus,
  type Recap,
} from '$engine/index';
import { loadContent, type AssembledContent } from '$content/index';
import { warmVoices } from '$lib/audio/tts';
import { createPersistence, type AppState, type PersistencePort, type Settings, type SyncStatus } from '$persist/index';
import {
  applyLessonCompletion,
  applyPause,
  applyResume,
  applyReview,
  applySetPlan,
  computePlan,
  doneSet,
} from './actions';

let persistence: PersistencePort;

export const app = $state({
  loading: true,
  ready: false,
  error: null as string | null,
  state: null as AppState | null,
  content: null as AssembledContent | null,
  syncStatus: { kind: 'local-only' } as SyncStatus,
  cloudEmail: null as string | null,
});

/** Local calendar day, 'YYYY-MM-DD'. (Store layer may read the clock; the engine may not.) */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const nowMs = () => Date.now();

const isDeprecated = (vocabId: string): boolean =>
  app.content?.db.vocab[vocabId]?.status === 'deprecated';

export async function boot(): Promise<void> {
  try {
    persistence = createPersistence();
    await persistence.init();
    const [state, content] = await Promise.all([persistence.load(), loadContent('a1')]);
    app.state = state;
    app.content = content;
    app.syncStatus = persistence.getSyncStatus();
    app.cloudEmail = persistence.cloudProfile?.()?.email ?? null;
    persistence.onSyncStatusChange((s) => (app.syncStatus = s));
    warmVoices();
    app.ready = true;
  } catch (e) {
    app.error = e instanceof Error ? e.message : String(e);
  } finally {
    app.loading = false;
  }
}

async function commit(mutate: (d: AppState) => void): Promise<void> {
  app.state = await persistence.patch(mutate);
}

/* ---- actions ---- */

export async function setPlan(intent: PaceIntent): Promise<void> {
  if (!app.content || !app.state) return;
  const plan = computePlan(app.content, app.state, todayKey(), intent);
  await commit((d) => applySetPlan(d, plan));
}

export async function completeLesson(lessonId: string, scorePct: number): Promise<void> {
  const lesson = app.content?.course.lessons.find((l) => l.id === lessonId);
  if (!lesson) return;
  await commit((d) => applyLessonCompletion(d, lesson, scorePct, todayKey(), nowMs()));
}

export async function submitReview(cardId: string, grade: Grade): Promise<void> {
  await commit((d) => applyReview(d, cardId, grade, todayKey(), nowMs()));
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await commit((d) => {
    d.settings = { ...d.settings, ...patch };
  });
}

export async function pausePlan(): Promise<void> {
  await commit((d) => applyPause(d, todayKey()));
}
export async function resumePlan(): Promise<void> {
  await commit(applyResume);
}
export async function reschedule(intent: PaceIntent): Promise<void> {
  await setPlan(intent);
}

/** Whether the active store supports cloud sync (true only when Drive sync is enabled). */
export function cloudAvailable(): boolean {
  return typeof persistence.connectCloud === 'function';
}
export async function connectCloud(): Promise<void> {
  await persistence.connectCloud?.();
  app.cloudEmail = persistence.cloudProfile?.()?.email ?? null;
  app.syncStatus = persistence.getSyncStatus();
}
export async function disconnectCloud(): Promise<void> {
  await persistence.disconnectCloud?.();
  app.cloudEmail = null;
  app.syncStatus = persistence.getSyncStatus();
}
export async function syncNow(): Promise<void> {
  await persistence.sync(true); // user-tapped — allowed to re-auth via the popup
  app.syncStatus = persistence.getSyncStatus();
}
export function cloudProfile(): { email: string; name: string } | null {
  return persistence.cloudProfile?.() ?? null;
}

/** Wipe ALL progress — local IndexedDB and (if connected) the Drive copy. */
export async function resetProgress(): Promise<void> {
  try {
    await persistence.clearCloud?.();
  } catch {
    /* cloud delete best-effort */
  }
  await persistence.clearLocal();
  app.state = await persistence.load();
  app.syncStatus = persistence.getSyncStatus();
}

export async function exportBackup() {
  return persistence.exportBackup();
}
export async function importBackup(file: unknown, strategy: 'replace' | 'merge' = 'merge') {
  const result = await persistence.importBackup(file, { strategy });
  app.state = await persistence.load();
  return result;
}

/* ---- selectors (call inside $derived in components) ---- */

export function getTodayQueue(): DayQueue | null {
  const s = app.state;
  if (!s?.plan || !app.content) return null;
  return recommendToday({
    plan: s.plan,
    cards: Object.values(s.srs.cards),
    course: app.content.course,
    done: doneSet(s),
    todayKey: todayKey(),
    nowMs: nowMs(),
    isDeprecated,
  });
}

export function getPace(): PaceStatus | null {
  const s = app.state;
  if (!s?.plan || !app.content) return null;
  return paceStatus(s.plan, app.content.course, doneSet(s), todayKey());
}

export function getCatchup(): CatchupDecision | null {
  const s = app.state;
  if (!s?.plan || !app.content) return null;
  return smartCatchup({ plan: s.plan, cards: Object.values(s.srs.cards), course: app.content.course, done: doneSet(s), todayKey: todayKey() });
}

export function getRecap(): Recap | null {
  const s = app.state;
  if (!s?.plan || !app.content) return null;
  return buildRecap({ plan: s.plan, cards: Object.values(s.srs.cards), course: app.content.course, done: doneSet(s), todayKey: todayKey(), isDeprecated });
}

export function hasPlan(): boolean {
  return !!app.state?.plan;
}

/* ---- M5 selectors: progress lookups + custom-date check + catch-up trigger ---- */

export function lessonStatus(id: string): 'done' | 'in_progress' | 'unseen' {
  return app.state?.progress.lessons[id]?.status ?? 'unseen';
}

export function moduleStats(moduleId: string): { done: number; total: number } {
  const mod = app.content?.modules.get(moduleId);
  const lessons = mod?.lessons ?? [];
  const done = lessons.filter((l) => lessonStatus(l.id) === 'done').length;
  return { done, total: lessons.length };
}

/** First not-done lesson in prereq order (the guided "next" node), or null if complete. */
export function nextRecommendedLessonId(): string | null {
  const s = app.state;
  if (!app.content || !s) return null;
  return lessonsNotDone(app.content.course, doneSet(s))[0]?.id ?? null;
}

export function checkCustomDate(targetDayKey: DayKey): CustomDateCheck | null {
  const s = app.state;
  if (!s || !app.content) return null;
  const hardCap = s.plan?.hardCapMin ?? 60;
  return validateCustomDate(app.content.course, Object.values(s.srs.cards), doneSet(s), targetDayKey, todayKey(), hardCap);
}

/** True when the learner returns after missing at least one full day and isn't paused. */
export function needsCatchup(): boolean {
  const s = app.state;
  if (!s?.plan || s.plan.pausedAt) return false;
  const last = s.streak.lastActiveDayKey;
  if (!last) return false;
  return compareDayKeys(last, addDays(todayKey(), -1)) < 0; // last is before yesterday
}

export function setCustomDate(targetDayKey: DayKey): Promise<void> {
  return setPlan({ kind: 'customDate', targetDayKey });
}

export const isDeprecatedVocab = isDeprecated;
