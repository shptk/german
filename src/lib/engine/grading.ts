/*
 * The 7 deterministic exercise checkers (pure). See DESIGN.md §2.4.
 *
 * Every check is exact-match against a declared answer key with explicit,
 * per-item tolerances — there is NO fuzzy grader (no Levenshtein, no
 * similarity threshold). Answers for vocab-derived types (gender, conjugation)
 * are read from the vocab pool, so a German fix in one place propagates.
 */

import type {
  Article,
  Cloze,
  ClozeBlank,
  ContentDb,
  Conjugate,
  Dictation,
  DragTile,
  Exercise,
  GenderTap,
  ImperativePerson,
  Match,
  Mcq,
  Person,
} from './content-types';

export interface NormOpts {
  caseSensitive?: boolean;
  foldUmlauts?: boolean;
}

/** The single declared normalizer. No hidden defaults; callers pass per-item options. */
export function norm(s: string, o: NormOpts = {}): string {
  let x = s.trim().replace(/\s+/g, ' ');
  if (!o.caseSensitive) x = x.toLowerCase();
  if (o.foldUmlauts) {
    x = x.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  }
  return x;
}

export interface Verdict {
  correct: boolean;
  expected?: string[];
  perSlot?: boolean[]; // per-blank / per-token truth
  wrongRefs?: string[]; // mis-matched vocab ids (match)
  rejectedSlots?: number[]; // blanks that hit a `reject` near-miss (for a targeted hint)
}

/** The learner's response, by exercise type. */
export interface Response {
  option?: Article; // gender-tap
  placed?: string[]; // drag-tile
  inputs?: string[]; // cloze (one per blank)
  text?: string; // conjugate / dictation
  pairing?: Record<string, string>; // match: leftId -> rightId
  choiceId?: string; // mcq
}

const eqTokens = (seq: string[], placed: string[]): boolean => {
  if (seq.length !== placed.length) return false;
  return seq.every((t, i) =>
    // sentence-initial token compared case-insensitively (German legitimately
    // re-capitalizes a frontable word); the rest exact.
    i === 0 ? t.toLowerCase() === (placed[i] ?? '').toLowerCase() : t === placed[i],
  );
};

export function checkGenderTap(ex: GenderTap, option: Article | undefined, db: ContentDb): Verdict {
  const article = db.vocab[ex.vocabRefs[0]]?.article;
  return { correct: option != null && option === article, expected: article ? [article] : [] };
}

export function checkDragTile(ex: DragTile, placed: string[] = []): Verdict {
  const correct = ex.accepted.some((seq) => eqTokens(seq, placed));
  return { correct, expected: [ex.accepted[0]?.join(' ') ?? ''] };
}

export function checkCloze(ex: Cloze, inputs: string[] = []): Verdict {
  const blanks = ex.segments.filter((s): s is { kind: 'blank' } & ClozeBlank => s.kind === 'blank');
  const perSlot = blanks.map((b, i) => {
    const o: NormOpts = { caseSensitive: !(b.caseInsensitive ?? false), foldUmlauts: b.umlautLenient ?? false };
    const given = inputs[i] ?? '';
    return b.answers.some((a) => norm(a, o) === norm(given, o));
  });
  const rejectedSlots = blanks
    .map((b, i) => {
      const given = inputs[i] ?? '';
      const hit = (b.reject ?? []).some((r) => norm(r) === norm(given));
      return hit && !perSlot[i] ? i : -1;
    })
    .filter((i) => i >= 0);
  return {
    correct: perSlot.length > 0 && perSlot.every(Boolean),
    perSlot,
    expected: blanks.map((b) => b.answers[0]),
    rejectedSlots,
  };
}

export function checkConjugate(ex: Conjugate, text = '', db: ContentDb): Verdict {
  const vm = db.vocab[ex.verbRef]?.verbMeta;
  const expected =
    ex.tense === 'imperativ'
      ? vm?.imperative?.[ex.person as ImperativePerson]
      : vm?.present?.[ex.person as Person];
  const accepted = expected ? [expected, ...(ex.acceptAlt ?? [])] : [];
  const o: NormOpts = { caseSensitive: false, foldUmlauts: false };
  return {
    correct: accepted.some((a) => norm(a, o) === norm(text, o)),
    expected: expected ? [expected] : [],
  };
}

export function checkMatch(ex: Match, pairing: Record<string, string> = {}): Verdict {
  const wrongRefs = ex.pairRefs.filter((id) => pairing[id] !== id);
  return { correct: wrongRefs.length === 0, wrongRefs };
}

const PUNCT = /[.,!?;:¿¡„“”"'’`]/g;

export function checkDictation(ex: Dictation, text = ''): Verdict {
  const strip = (s: string) => s.replace(PUNCT, '');
  const o: NormOpts = { caseSensitive: ex.caseSensitive ?? true, foldUmlauts: false }; // umlauts strict
  return {
    correct: ex.answers.some((a) => norm(strip(a), o) === norm(strip(text), o)),
    expected: [ex.answers[0]],
  };
}

export function checkMcq(ex: Mcq, choiceId: string | undefined): Verdict {
  return { correct: choiceId != null && choiceId === ex.correctChoiceId, expected: [ex.correctChoiceId] };
}

/** The single dispatch. The switch is exhaustive — TS errors if a type is unhandled. */
export function checkExercise(ex: Exercise, resp: Response, db: ContentDb): Verdict {
  switch (ex.type) {
    case 'gender-tap':
      return checkGenderTap(ex, resp.option, db);
    case 'drag-tile':
      return checkDragTile(ex, resp.placed);
    case 'cloze':
      return checkCloze(ex, resp.inputs);
    case 'conjugate':
      return checkConjugate(ex, resp.text, db);
    case 'match':
      return checkMatch(ex, resp.pairing);
    case 'dictation':
      return checkDictation(ex, resp.text);
    case 'mcq':
      return checkMcq(ex, resp.choiceId);
  }
}
