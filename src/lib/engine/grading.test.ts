import { describe, it, expect } from 'vitest';
import type {
  Cloze,
  Conjugate,
  ContentDb,
  Dictation,
  DragTile,
  GenderTap,
  Match,
  Mcq,
} from './content-types';
import {
  checkCloze,
  checkConjugate,
  checkDictation,
  checkDragTile,
  checkExercise,
  checkGenderTap,
  checkMatch,
  checkMcq,
  norm,
} from './grading';

const db: ContentDb = {
  vocab: {
    'a1.v.vater': { id: 'a1.v.vater', lemma: 'Vater', pos: 'noun', article: 'der', gloss: ['father'] },
    'a1.v.mutter': { id: 'a1.v.mutter', lemma: 'Mutter', pos: 'noun', article: 'die', gloss: ['mother'] },
    'a1.v.bruder': { id: 'a1.v.bruder', lemma: 'Bruder', pos: 'noun', article: 'der', gloss: ['brother'] },
    'a1.v.kommen': {
      id: 'a1.v.kommen',
      lemma: 'kommen',
      pos: 'verb',
      gloss: ['to come'],
      verbMeta: {
        type: 'regular',
        separable: false,
        auxiliary: 'sein',
        present: { ich: 'komme', du: 'kommst', er: 'kommt', wir: 'kommen', ihr: 'kommt', sie: 'kommen' },
        imperative: { du: 'komm', ihr: 'kommt', Sie: 'kommen Sie' },
        partizip2: 'gekommen',
      },
    },
  },
};

const base = { skill: 'output' as const, estSeconds: 20, vocabRefs: [] as string[] };

describe('norm', () => {
  it('collapses whitespace and lowercases by default', () => {
    expect(norm('  Der   Tisch ')).toBe('der tisch');
  });
  it('respects caseSensitive and foldUmlauts', () => {
    expect(norm('Über', { caseSensitive: true })).toBe('Über');
    expect(norm('Über', { foldUmlauts: true })).toBe('ueber');
  });
});

describe('gender-tap', () => {
  const ex: GenderTap = { ...base, id: 'e1', type: 'gender-tap', skill: 'reading', vocabRefs: ['a1.v.vater'] };
  it('derives the article from the vocab pool', () => {
    expect(checkGenderTap(ex, 'der', db).correct).toBe(true);
    expect(checkGenderTap(ex, 'die', db).correct).toBe(false);
    expect(checkGenderTap(ex, undefined, db).correct).toBe(false);
    expect(checkGenderTap(ex, 'der', db).expected).toEqual(['der']);
  });
});

describe('drag-tile', () => {
  const ex: DragTile = {
    ...base,
    id: 'e2',
    type: 'drag-tile',
    tiles: ['Das', 'ist', 'meine', 'Schwester'],
    accepted: [['Das', 'ist', 'meine', 'Schwester']],
  };
  it('accepts the exact ordering', () => {
    expect(checkDragTile(ex, ['Das', 'ist', 'meine', 'Schwester']).correct).toBe(true);
  });
  it('accepts a case-flipped sentence-initial token', () => {
    expect(checkDragTile(ex, ['das', 'ist', 'meine', 'Schwester']).correct).toBe(true);
  });
  it('rejects wrong order and mid-sentence case changes', () => {
    expect(checkDragTile(ex, ['ist', 'Das', 'meine', 'Schwester']).correct).toBe(false);
    expect(checkDragTile(ex, ['Das', 'ist', 'Meine', 'Schwester']).correct).toBe(false);
    expect(checkDragTile(ex, ['Das', 'ist', 'meine']).correct).toBe(false); // length
  });
});

describe('cloze', () => {
  const ex: Cloze = {
    ...base,
    id: 'e3',
    type: 'cloze',
    inputMode: 'type',
    segments: [
      { kind: 'text', value: 'Das ist ' },
      { kind: 'blank', id: 1, answers: ['meine'], caseInsensitive: true, reject: ['mein', 'meinen'] },
      { kind: 'text', value: ' Mutter.' },
    ],
  };
  it('grades blanks, case-insensitive when flagged', () => {
    expect(checkCloze(ex, ['meine']).correct).toBe(true);
    expect(checkCloze(ex, ['Meine']).correct).toBe(true);
  });
  it('flags a reject near-miss as incorrect with a targeted hint slot', () => {
    const v = checkCloze(ex, ['mein']);
    expect(v.correct).toBe(false);
    expect(v.rejectedSlots).toEqual([0]);
  });
  it('handles umlaut leniency per-blank', () => {
    const lenient: Cloze = {
      ...base,
      id: 'e3b',
      type: 'cloze',
      inputMode: 'type',
      segments: [{ kind: 'blank', id: 1, answers: ['hören'], umlautLenient: true }],
    };
    expect(checkCloze(lenient, ['hoeren']).correct).toBe(true);
    expect(checkCloze(lenient, ['hören']).correct).toBe(true);
    const strict: Cloze = { ...lenient, id: 'e3c', segments: [{ kind: 'blank', id: 1, answers: ['hören'] }] };
    expect(checkCloze(strict, ['hoeren']).correct).toBe(false);
  });
});

describe('conjugate', () => {
  it('derives present-tense forms from verbMeta', () => {
    const ex: Conjugate = {
      ...base,
      id: 'e4',
      type: 'conjugate',
      verbRef: 'a1.v.kommen',
      tense: 'praesens',
      person: 'du',
      inputMode: 'type',
    };
    expect(checkConjugate(ex, 'kommst', db).correct).toBe(true);
    expect(checkConjugate(ex, 'Kommst', db).correct).toBe(true); // verbs case-insensitive
    expect(checkConjugate(ex, 'kommt', db).correct).toBe(false);
    expect(checkConjugate(ex, 'kommst', db).expected).toEqual(['kommst']);
  });
  it('derives imperative forms', () => {
    const ex: Conjugate = {
      ...base,
      id: 'e5',
      type: 'conjugate',
      verbRef: 'a1.v.kommen',
      tense: 'imperativ',
      person: 'du',
      inputMode: 'type',
    };
    expect(checkConjugate(ex, 'komm', db).correct).toBe(true);
    expect(checkConjugate(ex, 'kommst', db).correct).toBe(false);
  });
});

describe('match', () => {
  const ex: Match = {
    ...base,
    id: 'e6',
    type: 'match',
    skill: 'reading',
    left: 'image',
    right: 'word-de',
    pairRefs: ['a1.v.vater', 'a1.v.mutter', 'a1.v.bruder'],
  };
  it('passes a full self-pairing and reports only mis-pairs', () => {
    expect(
      checkMatch(ex, { 'a1.v.vater': 'a1.v.vater', 'a1.v.mutter': 'a1.v.mutter', 'a1.v.bruder': 'a1.v.bruder' })
        .correct,
    ).toBe(true);
    const v = checkMatch(ex, {
      'a1.v.vater': 'a1.v.vater',
      'a1.v.mutter': 'a1.v.bruder',
      'a1.v.bruder': 'a1.v.mutter',
    });
    expect(v.correct).toBe(false);
    expect(v.wrongRefs).toEqual(['a1.v.mutter', 'a1.v.bruder']);
  });
});

describe('dictation', () => {
  const ex: Dictation = {
    ...base,
    id: 'e7',
    type: 'dictation',
    skill: 'listening',
    audioText: 'Mein Bruder heißt Tom.',
    answers: ['Mein Bruder heißt Tom.', 'Mein Bruder heisst Tom.'],
  };
  it('strips punctuation, keeps case sensitive by default', () => {
    expect(checkDictation(ex, 'Mein Bruder heißt Tom').correct).toBe(true); // missing period ok
    expect(checkDictation(ex, 'Mein Bruder heisst Tom.').correct).toBe(true); // accepted variant
    expect(checkDictation(ex, 'mein bruder heißt tom').correct).toBe(false); // case matters
  });
  it('grades umlauts strictly', () => {
    const e: Dictation = { ...ex, id: 'e7b', answers: ['schön'] };
    expect(checkDictation(e, 'schön').correct).toBe(true);
    expect(checkDictation(e, 'schon').correct).toBe(false);
    expect(checkDictation(e, 'schoen').correct).toBe(false);
  });
});

describe('mcq', () => {
  const ex: Mcq = {
    ...base,
    id: 'e8',
    type: 'mcq',
    skill: 'reading',
    choices: [
      { id: 'a', text: { en: "Anna's brother" } },
      { id: 'b', text: { en: "Anna's father" } },
    ],
    correctChoiceId: 'a',
  };
  it('matches by stable choice id', () => {
    expect(checkMcq(ex, 'a').correct).toBe(true);
    expect(checkMcq(ex, 'b').correct).toBe(false);
    expect(checkMcq(ex, undefined).correct).toBe(false);
  });
});

describe('checkExercise dispatch', () => {
  it('routes by type', () => {
    const tap: GenderTap = { ...base, id: 'd1', type: 'gender-tap', skill: 'reading', vocabRefs: ['a1.v.mutter'] };
    expect(checkExercise(tap, { option: 'die' }, db).correct).toBe(true);
    const mcq: Mcq = {
      ...base,
      id: 'd2',
      type: 'mcq',
      skill: 'reading',
      choices: [{ id: 'x', text: {} }],
      correctChoiceId: 'x',
    };
    expect(checkExercise(mcq, { choiceId: 'x' }, db).correct).toBe(true);
  });
});
