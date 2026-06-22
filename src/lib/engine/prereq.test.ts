import { describe, it, expect } from 'vitest';
import type { Course, Lesson } from './types';
import { lessonsNotDone, topoSort } from './prereq';

const L = (id: string, order: number, prereqIds: string[] = []): Lesson => ({
  id,
  moduleId: 'm',
  order,
  estMinutes: 6,
  prereqIds,
  introducesVocab: [],
});

describe('topoSort', () => {
  it('orders by `order` when there are no prereqs', () => {
    const out = topoSort([L('c', 3), L('a', 1), L('b', 2)]);
    expect(out.map((l) => l.id)).toEqual(['a', 'b', 'c']);
  });

  it('always places a lesson after its prereqs', () => {
    // 'a' depends on 'b' even though a.order < b.order
    const out = topoSort([L('a', 1, ['b']), L('b', 2)]);
    expect(out.map((l) => l.id)).toEqual(['b', 'a']);
  });

  it('handles a chain and a diamond deterministically', () => {
    const out = topoSort([
      L('d', 4, ['b', 'c']),
      L('b', 2, ['a']),
      L('c', 3, ['a']),
      L('a', 1),
    ]);
    expect(out.map((l) => l.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('lessonsNotDone', () => {
  it('drops done lessons, keeps prereq order', () => {
    const course: Course = { lessons: [L('a', 1), L('b', 2, ['a']), L('c', 3, ['b'])] };
    expect(lessonsNotDone(course, new Set(['a'])).map((l) => l.id)).toEqual(['b', 'c']);
    expect(lessonsNotDone(course, new Set(['a', 'b', 'c']))).toEqual([]);
  });
});
