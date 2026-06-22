/*
 * Builds the ordered list of items for a guided session from the engine's
 * recommended day-queue: due reviews first (warm-up), then each new lesson's
 * exercises. Review cards become a recall exercise (type the German for the
 * gloss). Pure + testable. (DESIGN §6 session loop — interleave polish later.)
 */

import type { AssembledContent } from '$content/index';
import type { Cloze, DayQueue, Exercise, VocabEntry } from '$engine/index';

export type SessionItem =
  | { kind: 'lesson'; lessonId: string; exercise: Exercise; lastOfLesson: boolean }
  | { kind: 'review'; cardId: string; exercise: Exercise };

/** A recall review: show the English gloss, type the German lemma. */
export function buildReviewExercise(v: VocabEntry): Exercise {
  const ex: Cloze = {
    id: `review:${v.id}`,
    type: 'cloze',
    skill: 'output',
    estSeconds: 20,
    vocabRefs: [v.id],
    inputMode: 'type',
    prompt: { en: `Type the German for "${v.gloss[0]}"` },
    segments: [{ kind: 'blank', id: 1, answers: [v.lemma], caseInsensitive: v.pos !== 'noun' }],
  };
  return ex;
}

function moduleOfLesson(content: AssembledContent, lessonId: string) {
  for (const m of content.modules.values()) {
    if (m.lessons.some((l) => l.id === lessonId)) return m;
  }
  return undefined;
}

export function buildSession(queue: DayQueue, content: AssembledContent): SessionItem[] {
  const items: SessionItem[] = [];

  for (const card of queue.reviews) {
    const v = content.db.vocab[card.id];
    if (v) items.push({ kind: 'review', cardId: card.id, exercise: buildReviewExercise(v) });
  }

  for (const lesson of queue.newLessons) {
    const mod = moduleOfLesson(content, lesson.id);
    const full = mod?.lessons.find((l) => l.id === lesson.id);
    const exs = (full?.exercises ?? []) as unknown as Exercise[];
    exs.forEach((ex, i) =>
      items.push({ kind: 'lesson', lessonId: lesson.id, exercise: ex, lastOfLesson: i === exs.length - 1 }),
    );
  }

  return items;
}
