/*
 * Content loading. Fetches the manifest first, then the level index, the vocab
 * pool, grammar notes, and module files (memoized). `assembleContent` is a pure
 * function (no fetch) that turns validated raw files into what the engine needs
 * — a level-agnostic Course (lesson metadata) + a ContentDb (vocab pool) — so it
 * is unit-testable without a browser.
 */

import type { Course, ContentDb, Lesson, VocabEntry } from '$engine/index';
import {
  parseGrammar,
  parseLevel,
  parseManifest,
  parseModuleFile,
  parseVocab,
  type GrammarNote,
  type LevelFile,
  type ManifestFile,
  type ModuleFile,
} from './schema';

export interface AssembledContent {
  manifest: ManifestFile;
  level: LevelFile;
  course: Course; // lesson metadata for the engine (planning/recommendation)
  db: ContentDb; // the vocab pool, for grading
  modules: Map<string, ModuleFile>; // by module id (exercise bodies)
  grammar: Map<string, GrammarNote>; // by note id
}

/** Pure assembler: validated raw files -> engine-facing content. */
export function assembleContent(
  manifest: ManifestFile,
  level: LevelFile,
  vocab: VocabEntry[],
  moduleFiles: ModuleFile[],
  grammarNotes: GrammarNote[],
): AssembledContent {
  const modules = new Map(moduleFiles.map((m) => [m.id, m]));
  const grammar = new Map(grammarNotes.map((g) => [g.id, g]));
  const db: ContentDb = { vocab: Object.fromEntries(vocab.map((v) => [v.id, v])) };

  // Order modules by the level's moduleOrder, then lessons by their local order.
  const moduleRank = new Map(level.moduleOrder.map((id, i) => [id, i]));
  const lessons: Lesson[] = [];
  for (const m of moduleFiles) {
    const rank = moduleRank.get(m.id) ?? m.order;
    for (const l of m.lessons) {
      lessons.push({
        id: l.id,
        moduleId: m.id,
        order: rank * 1000 + l.order, // global ordering respects moduleOrder
        estMinutes: l.estMinutes,
        prereqIds: l.prereqs ?? [],
        introducesVocab: l.introducesVocab ?? [],
      });
    }
  }

  return { manifest, level, course: { lessons }, db, modules, grammar };
}

/* ---- fetch layer (browser) ---- */

const base = import.meta.env.BASE_URL; // '/german/'
const cache = new Map<string, unknown>();

async function getJson(path: string): Promise<unknown> {
  if (cache.has(path)) return cache.get(path);
  const res = await fetch(`${base}content/${path}`);
  if (!res.ok) throw new Error(`content fetch failed: ${path} (${res.status})`);
  const json = (await res.json()) as unknown;
  cache.set(path, json);
  return json;
}

/** Load + validate everything for a level and assemble it. (Sample-scale; lazy per-module refinement is a later optimization.) */
export async function loadContent(levelId = 'a1'): Promise<AssembledContent> {
  const manifest = parseManifest(await getJson('manifest.json'));
  const levelMeta = manifest.levels.find((l) => l.id === levelId);
  if (!levelMeta) throw new Error(`level not in manifest: ${levelId}`);

  const level = parseLevel(await getJson(levelMeta.file));
  const vocab = parseVocab(await getJson(levelMeta.vocabFile));
  const grammar = levelMeta.grammarFile ? parseGrammar(await getJson(levelMeta.grammarFile)) : [];
  const moduleFiles = await Promise.all(
    level.modules.map(async (m) => parseModuleFile(await getJson(m.file))),
  );

  return assembleContent(manifest, level, vocab, moduleFiles, grammar);
}

/** Clear the fetch cache (used when a content update is accepted). */
export function clearContentCache(): void {
  cache.clear();
}
