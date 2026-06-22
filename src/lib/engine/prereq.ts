/*
 * Deterministic prerequisite ordering. Lessons are sorted so every lesson comes
 * after all its in-course prereqs; ties break by `order` then `id`. (DESIGN §5.)
 */

import type { Course, Lesson } from './types';

/** Topo-sort lessons honoring prereqIds; stable tie-break by (order, id). */
export function topoSort(lessons: Lesson[]): Lesson[] {
  const byId = new Map(lessons.map((l) => [l.id, l]));
  const indeg = new Map<string, number>();
  for (const l of lessons) {
    // only count prereqs that actually exist in this course
    indeg.set(l.id, l.prereqIds.filter((p) => byId.has(p)).length);
  }

  const cmp = (a: Lesson, b: Lesson) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const ready = lessons.filter((l) => (indeg.get(l.id) ?? 0) === 0).sort(cmp);
  const out: Lesson[] = [];
  const done = new Set<string>();

  while (ready.length) {
    const l = ready.shift() as Lesson;
    out.push(l);
    done.add(l.id);
    for (const other of lessons) {
      if (done.has(other.id) || ready.includes(other)) continue;
      if (other.prereqIds.includes(l.id)) {
        const n = (indeg.get(other.id) ?? 0) - 1;
        indeg.set(other.id, n);
        if (n === 0) {
          ready.push(other);
          ready.sort(cmp);
        }
      }
    }
  }

  // Defensive: if a cycle left lessons unplaced, append them in stable order.
  if (out.length < lessons.length) {
    for (const l of [...lessons].sort(cmp)) if (!done.has(l.id)) out.push(l);
  }
  return out;
}

/** Not-yet-completed lessons, in prereq order. */
export function lessonsNotDone(course: Course, done: ReadonlySet<string>): Lesson[] {
  return topoSort(course.lessons).filter((l) => !done.has(l.id));
}
