/*
 * Content linter (DESIGN §M3). Runs in CI via `npm run lint:content`. Validates
 * cross-references and per-exercise invariants that zod's structural validation
 * can't catch. `lintContent` is pure (unit-tested); `main` wires it to the files.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
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
} from '../src/lib/content/schema';

type Vocab = ReturnType<typeof parseVocab>[number];

export interface LintBundle {
  manifest: ManifestFile;
  level: LevelFile;
  vocab: Vocab[];
  modules: ModuleFile[];
  grammar: GrammarNote[];
}

/** Returns a list of human-readable problems; empty means clean. */
export function lintContent(b: LintBundle): string[] {
  const errs: string[] = [];
  const vocab = new Map(b.vocab.map((v) => [v.id, v]));
  const grammarIds = new Set(b.grammar.map((g) => g.id));
  const topicIds = new Set((b.level.grammarTopics ?? []).map((t) => t.id));

  // ---- duplicate ids (vocab, modules, lessons, exercises — globally) ----
  const dup = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) errs.push(`duplicate ${label} id: ${id}`);
      seen.add(id);
    }
  };
  dup('vocab', b.vocab.map((v) => v.id));
  dup('module', b.modules.map((m) => m.id));
  const lessonIds = b.modules.flatMap((m) => m.lessons.map((l) => l.id));
  dup('lesson', lessonIds);
  dup('exercise', b.modules.flatMap((m) => m.lessons.flatMap((l) => l.exercises.map((e) => e.id))));

  const lessonIdSet = new Set(lessonIds);
  const needVocab = (id: string, where: string) => {
    if (!vocab.has(id)) errs.push(`${where}: unknown vocab ref "${id}"`);
  };

  // ---- level.moduleOrder must reference real modules ----
  const moduleIdSet = new Set(b.modules.map((m) => m.id));
  for (const id of b.level.moduleOrder) {
    if (!moduleIdSet.has(id)) errs.push(`level.moduleOrder references unknown module "${id}"`);
  }

  for (const m of b.modules) {
    for (const id of m.vocabIds ?? []) needVocab(id, `${m.id}.vocabIds`);
    for (const l of m.lessons) {
      for (const p of l.prereqs ?? []) {
        if (!lessonIdSet.has(p)) errs.push(`${l.id}: unknown prereq lesson "${p}"`);
      }
      for (const g of l.grammarNotes ?? []) {
        if (!grammarIds.has(g)) errs.push(`${l.id}: unknown grammar note "${g}"`);
      }
      for (const id of l.introducesVocab ?? []) needVocab(id, `${l.id}.introducesVocab`);
      for (const id of l.reviewsVocab ?? []) needVocab(id, `${l.id}.reviewsVocab`);

      for (const e of l.exercises) {
        for (const id of e.vocabRefs) needVocab(id, `${e.id}.vocabRefs`);
        if (e.explainRef && !grammarIds.has(e.explainRef)) {
          errs.push(`${e.id}: unknown explainRef "${e.explainRef}"`);
        }

        switch (e.type) {
          case 'gender-tap': {
            const v = vocab.get(e.vocabRefs[0]);
            if (v && !v.article) errs.push(`${e.id}: gender-tap on "${e.vocabRefs[0]}" which has no article (underivable)`);
            break;
          }
          case 'conjugate': {
            needVocab(e.verbRef, `${e.id}.verbRef`);
            const v = vocab.get(e.verbRef);
            const forms = e.tense === 'imperativ' ? v?.verbMeta?.imperative : v?.verbMeta?.present;
            if (v && (!forms || !(forms as Record<string, string>)[e.person])) {
              errs.push(`${e.id}: conjugate ${e.tense}/${e.person} of "${e.verbRef}" is underivable (missing verbMeta form)`);
            }
            break;
          }
          case 'drag-tile': {
            for (const d of e.distractorTiles ?? []) {
              if (e.accepted.some((seq) => seq.includes(d))) {
                errs.push(`${e.id}: distractor tile "${d}" appears in an accepted sequence`);
              }
            }
            for (const seq of e.accepted) {
              for (const tok of seq) {
                if (!e.tiles.includes(tok)) errs.push(`${e.id}: accepted token "${tok}" is not in the tile pool`);
              }
            }
            break;
          }
          case 'cloze': {
            if (e.inputMode === 'pick') {
              const bank = new Set(e.bank ?? []);
              for (const s of e.segments) {
                if (s.kind === 'blank' && !bank.has(s.answers[0])) {
                  errs.push(`${e.id}: pick-cloze blank ${s.id} answer "${s.answers[0]}" missing from bank`);
                }
              }
            }
            break;
          }
          case 'match': {
            for (const id of e.pairRefs) needVocab(id, `${e.id}.pairRefs`);
            if (new Set(e.pairRefs).size !== e.pairRefs.length) errs.push(`${e.id}: duplicate pairRef`);
            break;
          }
          case 'mcq': {
            const ids = new Set(e.choices.map((c) => c.id));
            if (!ids.has(e.correctChoiceId)) errs.push(`${e.id}: correctChoiceId "${e.correctChoiceId}" not among choices`);
            break;
          }
          case 'dictation':
            break;
        }
      }
    }
  }

  // referenced grammar topics on modules should exist in the level registry
  for (const m of b.modules) {
    for (const t of m.grammarTopics ?? []) {
      if (!topicIds.has(t)) errs.push(`${m.id}: grammar topic "${t}" not in level registry`);
    }
  }

  return errs;
}

/* ---- CLI ---- */

function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = resolve(here, '../public/content');
  const read = (p: string) => JSON.parse(readFileSync(resolve(dir, p), 'utf8')) as unknown;

  const manifest = parseManifest(read('manifest.json'));
  const levelMeta = manifest.levels[0];
  const level = parseLevel(read(levelMeta.file));
  const vocab = parseVocab(read(levelMeta.vocabFile));
  const grammar = levelMeta.grammarFile ? parseGrammar(read(levelMeta.grammarFile)) : [];
  const modules = level.modules.map((m) => parseModuleFile(read(m.file)));

  const errs = lintContent({ manifest, level, vocab, modules, grammar });
  if (errs.length) {
    console.error(`✗ content lint: ${errs.length} problem(s)`);
    for (const e of errs) console.error('  - ' + e);
    process.exit(1);
  }
  console.log('✓ content lint OK');
}

// Run only as a CLI (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) main();
