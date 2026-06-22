/*
 * Content shapes the ENGINE operates on (level-agnostic). The full content
 * schema + zod runtime validation lives in the content layer (M3); these are
 * the TypeScript types the pure engine needs to grade and schedule. (DESIGN §2.4/§2.5.)
 */

export type Person = 'ich' | 'du' | 'er' | 'wir' | 'ihr' | 'sie';
export type ImperativePerson = 'du' | 'ihr' | 'Sie';
export type Article = 'der' | 'die' | 'das';

export interface VerbMeta {
  type?: string; // descriptive: regular | irregular | mixed | modal | …
  separable?: boolean;
  auxiliary?: 'haben' | 'sein';
  present: Record<Person, string>;
  imperative?: Record<ImperativePerson, string>;
  partizip2?: string;
}

/** A single canonical vocab entry — the ONE home of a German word. */
export interface VocabEntry {
  id: string;
  lemma: string;
  pos: string; // noun | verb | adj | adv | prep | pron | num | phrase | other
  gender?: 'm' | 'f' | 'n';
  article?: Article;
  plural?: string;
  gloss: string[];
  example?: { de: string; en: string };
  ipa?: string;
  audioUrl?: string | null;
  audioText?: string;
  verbMeta?: VerbMeta;
  frequencyRank?: number;
  tags?: string[];
  introducedIn?: string;
  cefr?: string;
  status?: 'active' | 'deprecated';
}

export type Skill = 'listening' | 'reading' | 'output';
export type ExerciseType =
  | 'gender-tap'
  | 'drag-tile'
  | 'cloze'
  | 'conjugate'
  | 'match'
  | 'dictation'
  | 'mcq';

interface ExerciseBase {
  id: string;
  type: ExerciseType;
  skill: Skill;
  estSeconds: number;
  prompt?: { de?: string; en?: string };
  /** REQUIRED SRS fan-out contract: every checkable-vocab type lists the atoms it exercises. */
  vocabRefs: string[];
  explainRef?: string | null;
  source?: 'auto' | 'template' | 'hand';
  audioOnReveal?: boolean;
  playCount?: number; // mock-exam replay limit
}

export interface GenderTap extends ExerciseBase {
  type: 'gender-tap';
  // answer derived from vocabRefs[0].article
}

export interface DragTile extends ExerciseBase {
  type: 'drag-tile';
  tiles: string[];
  accepted: string[][]; // any one accepted ordering is correct
  distractorTiles?: string[];
  translationEn?: string;
  audioText?: string;
}

export interface ClozeBlank {
  id: number;
  answers: string[];
  caseInsensitive?: boolean;
  umlautLenient?: boolean;
  reject?: string[]; // near-miss values that trigger a targeted hint (still incorrect)
}
export type ClozeSegment = { kind: 'text'; value: string } | ({ kind: 'blank' } & ClozeBlank);

export interface Cloze extends ExerciseBase {
  type: 'cloze';
  inputMode: 'type' | 'pick';
  segments: ClozeSegment[];
  bank?: string[] | null; // present for 'pick'
}

export interface Conjugate extends ExerciseBase {
  type: 'conjugate';
  verbRef: string;
  tense: 'praesens' | 'imperativ';
  person: Person | ImperativePerson;
  inputMode: 'type' | 'pick';
  acceptAlt?: string[];
}

export interface Match extends ExerciseBase {
  type: 'match';
  left: 'image' | 'word-de' | 'audio';
  right: 'image' | 'word-de' | 'audio' | 'gloss';
  pairRefs: string[]; // each id pairs with itself
}

export interface Dictation extends ExerciseBase {
  type: 'dictation';
  audioText: string;
  answers: string[];
  caseSensitive?: boolean; // default true
  normalizeWhitespace?: boolean;
}

export interface McqChoice {
  id: string;
  text: { de?: string; en?: string };
}
export interface Mcq extends ExerciseBase {
  type: 'mcq';
  subtype?: string;
  passage?: { de?: string; en?: string };
  audioText?: string; // listening items: spoken, not shown
  choices: McqChoice[];
  correctChoiceId: string;
}

export type Exercise = GenderTap | DragTile | Cloze | Conjugate | Match | Dictation | Mcq;

/** What the grader needs from content: vocab lookup by id. */
export interface ContentDb {
  vocab: Record<string, VocabEntry>;
}
