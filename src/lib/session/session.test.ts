import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { checkExercise, newCard, type DayQueue, type SrsCard } from '$engine/index';
import { assembleContent, parseGrammar, parseLevel, parseManifest, parseModuleFile, parseVocab } from '$content/index';
import { buildReviewExercise, buildSession } from './session';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../public/content');
const read = (p: string) => JSON.parse(readFileSync(resolve(dir, p), 'utf8')) as unknown;
const content = assembleContent(
  parseManifest(read('manifest.json')),
  parseLevel(read('levels/a1.json')),
  parseVocab(read('vocab/a1.vocab.json')),
  [parseModuleFile(read('modules/a1.m00-erste-schritte.json'))],
  parseGrammar(read('levels/a1.grammar.json')),
);

const L0 = 'a1.m00-erste-schritte.l00-begruessung';

describe('buildReviewExercise', () => {
  it('is a recall cloze that grades the German lemma', () => {
    const ex = buildReviewExercise(content.db.vocab['a1.v.name']);
    expect(ex.type).toBe('cloze');
    expect(checkExercise(ex, { inputs: ['Name'] }, content.db).correct).toBe(true);
    expect(checkExercise(ex, { inputs: ['Nme'] }, content.db).correct).toBe(false);
  });
});

describe('buildSession', () => {
  it('puts due reviews before new-lesson exercises and flags lesson ends', () => {
    const card: SrsCard = { ...newCard('a1.v.hallo', 0), state: 'review', dueDayKey: '2026-06-22' };
    const queue: DayQueue = {
      reviews: [card],
      deferredReviews: [],
      newLessons: [content.course.lessons[0]], // l00
      estMin: 20,
      reviewsHeavy: false,
    };
    const items = buildSession(queue, content);

    expect(items[0]).toMatchObject({ kind: 'review', cardId: 'a1.v.hallo' });
    const lessonItems = items.filter((x) => x.kind === 'lesson');
    expect(lessonItems.length).toBe(4); // l00 has 4 exercises
    expect(lessonItems.every((x) => x.kind === 'lesson' && x.lessonId === L0)).toBe(true);
    expect(lessonItems.filter((x) => x.kind === 'lesson' && x.lastOfLesson)).toHaveLength(1);
  });
});
