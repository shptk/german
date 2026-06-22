import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { Exercise } from '../engine/content-types';
import { checkExercise } from '../engine/grading';
import { assembleContent } from './loader';
import { parseExam, parseGrammar, parseLevel, parseManifest, parseModuleFile, parseVocab } from './schema';
import { lintContent, type LintBundle } from '../../../tools/lint-content';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../public/content');
const read = (p: string) => JSON.parse(readFileSync(resolve(dir, p), 'utf8')) as unknown;

const manifest = parseManifest(read('manifest.json'));
const level = parseLevel(read('levels/a1.json'));
const vocab = parseVocab(read('vocab/a1.vocab.json'));
const grammar = parseGrammar(read('levels/a1.grammar.json'));
const modules = level.modules.map((m) => parseModuleFile(read(m.file)));
const exam = parseExam(read('exam/a1.mock.json'));
const fullBundle: LintBundle = { manifest, level, vocab, modules, grammar };

describe('full A1 content', () => {
  it('parses against the zod schemas (no throw above)', () => {
    expect(modules.length).toBe(10);
    expect(vocab.length).toBeGreaterThanOrEqual(600);
    expect(grammar.length).toBeGreaterThanOrEqual(20);
  });

  it('passes the content lint cleanly', () => {
    expect(lintContent(fullBundle)).toEqual([]);
  });

  it('assembles into an engine Course + ContentDb', () => {
    const c = assembleContent(manifest, level, vocab, modules, grammar, exam);
    expect(c.course.lessons.length).toBeGreaterThanOrEqual(60);
    expect(Object.keys(c.db.vocab).length).toBe(vocab.length);
    expect(c.exam?.sections.length).toBeGreaterThanOrEqual(3);
  });

  it('the mock exam has gradable items + a speaking self-check', () => {
    const graded = exam.sections.filter((s) => s.graded);
    expect(graded.flatMap((s) => s.items ?? []).length).toBeGreaterThan(0);
    expect(exam.sections.find((s) => s.skill === 'sprechen')?.speakingTasks?.length ?? 0).toBeGreaterThan(0);
  });
});

describe('content integrates with the engine grader (M0 sample)', () => {
  const db = assembleContent(manifest, level, vocab, modules, grammar).db;
  const exercises = modules.flatMap((m) => m.lessons.flatMap((l) => l.exercises)) as unknown as Exercise[];
  const byId = (id: string) => exercises.find((e) => e.id === id) as Exercise;

  it('grades a vocab-derived gender-tap (das Land)', () => {
    const ex = byId('a1.m00-erste-schritte.l02-herkunft.e03');
    expect(checkExercise(ex, { option: 'das' }, db).correct).toBe(true);
    expect(checkExercise(ex, { option: 'die' }, db).correct).toBe(false);
  });

  it('grades a derived conjugation (kommen, du -> kommst)', () => {
    const ex = byId('a1.m00-erste-schritte.l02-herkunft.e01');
    expect(checkExercise(ex, { text: 'kommst' }, db).correct).toBe(true);
  });

  it('grades a cloze with reject hint', () => {
    const ex = byId('a1.m00-erste-schritte.l01-name.e01');
    expect(checkExercise(ex, { inputs: ['heiße'] }, db).correct).toBe(true);
    expect(checkExercise(ex, { inputs: ['heißt'] }, db).rejectedSlots).toEqual([0]);
  });

  it('every kept exercise grades deterministically without throwing', () => {
    const db2 = assembleContent(manifest, level, vocab, modules, grammar).db;
    for (const ex of exercises) {
      expect(() => checkExercise(ex, {}, db2)).not.toThrow();
    }
  });
});

describe('lintContent catches violations (minimal bundle)', () => {
  const miniLevel = { ...level, moduleOrder: ['a1.mtest'], modules: [] };
  const mk = (ex: unknown): LintBundle =>
    ({
      manifest,
      level: miniLevel,
      vocab,
      grammar,
      modules: [
        { id: 'a1.mtest', level: 'a1', title: 'X', order: 0, grammarTopics: [], lessons: [{ id: 'a1.mtest.lx', title: 'X', order: 0, estMinutes: 5, exercises: [ex] }] },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
    }) as LintBundle;
  const base = { id: 'e', skill: 'reading', estSeconds: 10, vocabRefs: [] as string[] };
  const errs = (ex: unknown) => lintContent(mk(ex));

  it('flags a broken vocab ref', () => {
    expect(errs({ ...base, type: 'gender-tap', vocabRefs: ['a1.v.nope'] }).some((e) => e.includes('unknown vocab ref'))).toBe(true);
  });
  it('flags an underivable gender-tap (vocab without article)', () => {
    expect(errs({ ...base, type: 'gender-tap', vocabRefs: ['a1.v.heissen'] }).some((e) => e.includes('underivable'))).toBe(true);
  });
  it('flags a distractor that appears in an accepted sequence', () => {
    expect(
      errs({ ...base, type: 'drag-tile', skill: 'output', tiles: ['Ich', 'bin'], accepted: [['Ich', 'bin']], distractorTiles: ['bin'] }).some((e) => e.includes('distractor')),
    ).toBe(true);
  });
  it('flags an mcq whose key is not a choice', () => {
    expect(errs({ ...base, type: 'mcq', choices: [{ id: 'a', text: { en: 'x' } }, { id: 'b', text: { en: 'y' } }], correctChoiceId: 'z' }).some((e) => e.includes('correctChoiceId'))).toBe(true);
  });
});
