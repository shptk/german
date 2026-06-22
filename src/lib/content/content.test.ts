import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { Exercise } from '../engine/content-types';
import { checkExercise } from '../engine/grading';
import { assembleContent } from './loader';
import { parseGrammar, parseLevel, parseManifest, parseModuleFile, parseVocab } from './schema';
import { lintContent, type LintBundle } from '../../../tools/lint-content';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../public/content');
const read = (p: string) => JSON.parse(readFileSync(resolve(dir, p), 'utf8')) as unknown;

const manifest = parseManifest(read('manifest.json'));
const level = parseLevel(read('levels/a1.json'));
const vocab = parseVocab(read('vocab/a1.vocab.json'));
const grammar = parseGrammar(read('levels/a1.grammar.json'));
const moduleFile = parseModuleFile(read('modules/a1.m00-erste-schritte.json'));
const bundle: LintBundle = { manifest, level, vocab, modules: [moduleFile], grammar };

describe('sample content parses + assembles', () => {
  it('validates against the zod schemas (no throw above)', () => {
    expect(manifest.levels[0].id).toBe('a1');
    expect(vocab).toHaveLength(16);
  });

  it('assembles into an engine Course + ContentDb', () => {
    const c = assembleContent(manifest, level, vocab, [moduleFile], grammar);
    expect(c.course.lessons.map((l) => l.id)).toEqual([
      'a1.m00-erste-schritte.l00-begruessung',
      'a1.m00-erste-schritte.l01-name',
      'a1.m00-erste-schritte.l02-herkunft',
    ]);
    expect(Object.keys(c.db.vocab)).toHaveLength(16);
    expect(c.course.lessons[1].prereqIds).toContain('a1.m00-erste-schritte.l00-begruessung');
  });
});

describe('content integrates with the engine grader', () => {
  const db = assembleContent(manifest, level, vocab, [moduleFile], grammar).db;
  const exercises = moduleFile.lessons.flatMap((l) => l.exercises) as unknown as Exercise[];
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

  it('grades the imperative (komm)', () => {
    const ex = byId('a1.m00-erste-schritte.l02-herkunft.e07');
    expect(checkExercise(ex, { text: 'komm' }, db).correct).toBe(true);
  });

  it('grades a cloze with reject hint', () => {
    const ex = byId('a1.m00-erste-schritte.l01-name.e01');
    expect(checkExercise(ex, { inputs: ['heiße'] }, db).correct).toBe(true);
    expect(checkExercise(ex, { inputs: ['heißt'] }, db).rejectedSlots).toEqual([0]);
  });
});

describe('lintContent', () => {
  it('passes on the real sample content', () => {
    expect(lintContent(bundle)).toEqual([]);
  });

  // minimal-bundle factory for negative cases
  const mk = (ex: unknown): LintBundle => ({
    manifest,
    level: { ...level, grammarTopics: level.grammarTopics },
    vocab,
    grammar,
    modules: [
      {
        id: 'a1.m00-erste-schritte',
        level: 'a1',
        title: 'X',
        order: 0,
        grammarTopics: [],
        lessons: [
          {
            id: 'a1.m00-erste-schritte.lx',
            title: 'X',
            order: 0,
            estMinutes: 5,
            exercises: [ex],
          },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    ],
  });

  const base = { id: 'e', skill: 'reading', estSeconds: 10, vocabRefs: [] as string[] };

  it('flags a broken vocab ref', () => {
    const errs = mkErrs({ ...base, type: 'gender-tap', vocabRefs: ['a1.v.nope'] });
    expect(errs.some((e) => e.includes('unknown vocab ref'))).toBe(true);
  });

  it('flags an underivable gender-tap (vocab without article)', () => {
    const errs = mkErrs({ ...base, type: 'gender-tap', vocabRefs: ['a1.v.heissen'] }); // a verb, no article
    expect(errs.some((e) => e.includes('underivable'))).toBe(true);
  });

  it('flags a distractor that appears in an accepted sequence', () => {
    const errs = mkErrs({
      ...base,
      type: 'drag-tile',
      skill: 'output',
      tiles: ['Ich', 'bin'],
      accepted: [['Ich', 'bin']],
      distractorTiles: ['bin'],
    });
    expect(errs.some((e) => e.includes('distractor'))).toBe(true);
  });

  it('flags an mcq whose key is not a choice', () => {
    const errs = mkErrs({
      ...base,
      type: 'mcq',
      choices: [{ id: 'a', text: { en: 'x' } }, { id: 'b', text: { en: 'y' } }],
      correctChoiceId: 'z',
    });
    expect(errs.some((e) => e.includes('correctChoiceId'))).toBe(true);
  });

  it('flags a pick-cloze whose answer is missing from the bank', () => {
    const errs = mkErrs({
      ...base,
      type: 'cloze',
      skill: 'output',
      inputMode: 'pick',
      bank: ['foo', 'bar'],
      segments: [{ kind: 'blank', id: 1, answers: ['heiße'] }],
    });
    expect(errs.some((e) => e.includes('missing from bank'))).toBe(true);
  });

  function mkErrs(ex: unknown): string[] {
    return lintContent(mk(ex));
  }
});
