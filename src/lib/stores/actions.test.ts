import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { recommendToday } from '$engine/index';
import { assembleContent, parseGrammar, parseLevel, parseManifest, parseModuleFile, parseVocab } from '$content/index';
import { MemoryStore } from '$persist/index';
import { applyLessonCompletion, applyReview, applySetPlan, computePlan, doneSet } from './actions';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../public/content');
const read = (p: string) => JSON.parse(readFileSync(resolve(dir, p), 'utf8')) as unknown;
const content = assembleContent(
  parseManifest(read('manifest.json')),
  parseLevel(read('levels/a1.json')),
  parseVocab(read('vocab/a1.vocab.json')),
  [parseModuleFile(read('modules/a1.m00-erste-schritte.json'))],
  parseGrammar(read('levels/a1.grammar.json')),
);

const TODAY = '2026-06-22';
const L0 = 'a1.m00-erste-schritte.l00-begruessung';

function makeStore() {
  let t = 0;
  return new MemoryStore('dev', () => ++t);
}

describe('end-to-end data flow (M3 acceptance)', () => {
  it('set plan -> recommend -> complete lesson -> persist -> restore', async () => {
    const store = makeStore();
    await store.init();

    await store.patch((d) => applySetPlan(d, computePlan(content, d, TODAY, { kind: 'preset', presetId: 'steady' })));
    let st = await store.load();
    expect(st.plan).not.toBeNull();
    expect(st.plan?.totalNewLessonsAtStart).toBe(3);

    const q1 = recommendToday({ plan: st.plan!, cards: Object.values(st.srs.cards), course: content.course, done: doneSet(st), todayKey: TODAY, nowMs: 1 });
    expect(q1.newLessons[0].id).toBe(L0);

    const lesson = content.course.lessons[0];
    await store.patch((d) => applyLessonCompletion(d, lesson, 1, TODAY, 2));

    st = await store.load(); // "reload"
    expect(st.progress.lessons[L0].status).toBe('done');
    expect(st.progress.totals.lessonsDone).toBe(1);
    expect(st.streak.current).toBe(1);
    expect(st.dayLog[TODAY].doneNew).toBe(1);
    for (const vid of lesson.introducesVocab) {
      expect(st.srs.cards[vid].state).toBe('learning');
      expect(st.srs.cards[vid].dueDayKey).toBe('2026-06-23'); // due tomorrow, not today (fix #5)
    }

    const q2 = recommendToday({ plan: st.plan!, cards: Object.values(st.srs.cards), course: content.course, done: doneSet(st), todayKey: TODAY, nowMs: 3 });
    expect(q2.newLessons.find((l) => l.id === L0)).toBeUndefined(); // no longer recommended
  });

  it('reviews a seeded card the next day', async () => {
    const store = makeStore();
    await store.init();
    await store.patch((d) => applySetPlan(d, computePlan(content, d, TODAY, { kind: 'preset', presetId: 'steady' })));
    const lesson = content.course.lessons[0];
    await store.patch((d) => applyLessonCompletion(d, lesson, 1, TODAY, 2));

    const vid = lesson.introducesVocab[0];
    await store.patch((d) => applyReview(d, vid, 'good', '2026-06-23', 5));
    const st = await store.load();
    expect(st.srs.cards[vid].totalReviews).toBe(1);
    expect(st.srs.cards[vid].state).toBe('review');
    expect(st.dayLog['2026-06-23'].doneReviews).toBe(1);
  });
});
