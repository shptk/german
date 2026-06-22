/*
 * Runtime validation for shipped content (DESIGN §2). zod parses every content
 * file at load so a malformed ship fails loud instead of corrupting the runtime.
 * The schemas mirror the engine's hand-written content types (engine stays pure
 * and zod-free); the loader casts validated data to those types.
 */

import { z } from 'zod';

const loc = z.object({ de: z.string().optional(), en: z.string().optional() });
const article = z.enum(['der', 'die', 'das']);

// Explicit full form-objects (not z.record) so the inferred type is a complete
// Record<Person,string>, matching the engine's VerbMeta exactly.
const presentForms = z.object({
  ich: z.string(),
  du: z.string(),
  er: z.string(),
  wir: z.string(),
  ihr: z.string(),
  sie: z.string(),
});
const imperativeForms = z.object({ du: z.string(), ihr: z.string(), Sie: z.string() });

export const verbMetaSchema = z.object({
  type: z.enum(['regular', 'irregular', 'mixed']).optional(),
  separable: z.boolean().optional(),
  auxiliary: z.enum(['haben', 'sein']).optional(),
  present: presentForms,
  imperative: imperativeForms.optional(),
  partizip2: z.string().optional(),
});

export const vocabEntrySchema = z.object({
  id: z.string(),
  lemma: z.string(),
  pos: z.enum(['noun', 'verb', 'adj', 'adv', 'prep', 'pron', 'num', 'phrase', 'other']),
  gender: z.enum(['m', 'f', 'n']).optional(),
  article: article.optional(),
  plural: z.string().optional(),
  gloss: z.array(z.string()).min(1),
  example: z.object({ de: z.string(), en: z.string() }).optional(),
  ipa: z.string().optional(),
  audioUrl: z.string().nullable().optional(),
  audioText: z.string().optional(),
  verbMeta: verbMetaSchema.optional(),
  frequencyRank: z.number().optional(),
  tags: z.array(z.string()).optional(),
  introducedIn: z.string().optional(),
  cefr: z.string().optional(),
  status: z.enum(['active', 'deprecated']).optional(),
});

const exerciseBase = {
  id: z.string(),
  skill: z.enum(['listening', 'reading', 'output']),
  estSeconds: z.number(),
  prompt: loc.optional(),
  vocabRefs: z.array(z.string()),
  explainRef: z.string().nullable().optional(),
  source: z.enum(['auto', 'template', 'hand']).optional(),
  audioOnReveal: z.boolean().optional(),
  playCount: z.number().optional(),
};

const clozeSegment = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), value: z.string() }),
  z.object({
    kind: z.literal('blank'),
    id: z.number(),
    answers: z.array(z.string()).min(1),
    caseInsensitive: z.boolean().optional(),
    umlautLenient: z.boolean().optional(),
    reject: z.array(z.string()).optional(),
  }),
]);

export const exerciseSchema = z.discriminatedUnion('type', [
  z.object({ ...exerciseBase, type: z.literal('gender-tap') }),
  z.object({
    ...exerciseBase,
    type: z.literal('drag-tile'),
    tiles: z.array(z.string()).min(1),
    accepted: z.array(z.array(z.string()).min(1)).min(1),
    distractorTiles: z.array(z.string()).optional(),
    translationEn: z.string().optional(),
    audioText: z.string().optional(),
  }),
  z.object({
    ...exerciseBase,
    type: z.literal('cloze'),
    inputMode: z.enum(['type', 'pick']),
    segments: z.array(clozeSegment).min(1),
    bank: z.array(z.string()).nullable().optional(),
  }),
  z.object({
    ...exerciseBase,
    type: z.literal('conjugate'),
    verbRef: z.string(),
    tense: z.enum(['praesens', 'imperativ']),
    person: z.enum(['ich', 'du', 'er', 'wir', 'ihr', 'sie', 'Sie']),
    inputMode: z.enum(['type', 'pick']),
    acceptAlt: z.array(z.string()).optional(),
  }),
  z.object({
    ...exerciseBase,
    type: z.literal('match'),
    left: z.enum(['image', 'word-de', 'audio']),
    right: z.enum(['image', 'word-de', 'audio', 'gloss']),
    pairRefs: z.array(z.string()).min(2),
  }),
  z.object({
    ...exerciseBase,
    type: z.literal('dictation'),
    audioText: z.string(),
    answers: z.array(z.string()).min(1),
    caseSensitive: z.boolean().optional(),
    normalizeWhitespace: z.boolean().optional(),
  }),
  z.object({
    ...exerciseBase,
    type: z.literal('mcq'),
    subtype: z.enum(['reading', 'translation', 'listening', 'truefalse']).optional(),
    passage: loc.optional(),
    audioText: z.string().optional(),
    choices: z.array(z.object({ id: z.string(), text: loc })).min(2),
    correctChoiceId: z.string(),
  }),
]);

export const lessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number(),
  estMinutes: z.number(),
  objectives: z.array(z.string()).optional(),
  prereqs: z.array(z.string()).optional(),
  grammarNotes: z.array(z.string()).optional(),
  introducesVocab: z.array(z.string()).optional(),
  reviewsVocab: z.array(z.string()).optional(),
  exercises: z.array(exerciseSchema),
});

export const moduleFileSchema = z.object({
  id: z.string(),
  level: z.string(),
  title: z.string(),
  order: z.number(),
  icon: z.string().optional(),
  estMinutes: z.number().optional(),
  grammarTopics: z.array(z.string()).optional(),
  vocabIds: z.array(z.string()).optional(),
  lessons: z.array(lessonSchema).min(1),
});

const grammarBlock = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('paragraph'), text: z.string() }),
  z.object({ kind: z.literal('table'), headers: z.array(z.string()), rows: z.array(z.array(z.string())) }),
  z.object({ kind: z.literal('examples'), items: z.array(z.object({ de: z.string(), en: z.string() })) }),
  z.object({ kind: z.literal('tip'), text: z.string() }),
  z.object({ kind: z.literal('list'), items: z.array(z.string()) }),
]);

export const grammarNoteSchema = z.object({
  id: z.string(),
  topic: z.string(),
  level: z.string(),
  title: z.string(),
  summary: z.string(),
  body: z.array(grammarBlock),
  relatedNotes: z.array(z.string()).optional(),
  relatedVocab: z.array(z.string()).optional(),
});

const levelModulePointer = z.object({
  id: z.string(),
  file: z.string(),
  title: z.string(),
  order: z.number(),
  icon: z.string().optional(),
  lessonCount: z.number(),
  estMinutes: z.number(),
  vocabCount: z.number().optional(),
  grammarTopics: z.array(z.string()).optional(),
});

export const levelFileSchema = z.object({
  id: z.string(),
  cefr: z.string(),
  title: z.string(),
  moduleOrder: z.array(z.string()),
  modules: z.array(levelModulePointer),
  grammarTopics: z.array(z.object({ id: z.string(), title: z.string() })).optional(),
});

export const manifestSchema = z.object({
  schemaVersion: z.number(),
  contentVersion: z.string(),
  generatedAt: z.string().optional(),
  defaultLocale: z.string().optional(),
  levels: z
    .array(
      z.object({
        id: z.string(),
        cefr: z.string(),
        title: z.string(),
        examBenchmark: z.string().optional(),
        file: z.string(),
        vocabFile: z.string(),
        grammarFile: z.string().optional(),
        examFile: z.string().optional(),
        moduleCount: z.number(),
        lessonCount: z.number(),
        vocabCount: z.number(),
        estMinutesTotal: z.number().optional(),
        status: z.enum(['stable', 'draft']).optional(),
      }),
    )
    .min(1),
});

export const vocabFileSchema = z.array(vocabEntrySchema);
export const grammarFileSchema = z.array(grammarNoteSchema);

export type ManifestFile = z.infer<typeof manifestSchema>;
export type LevelFile = z.infer<typeof levelFileSchema>;
export type ModuleFile = z.infer<typeof moduleFileSchema>;
export type GrammarNote = z.infer<typeof grammarNoteSchema>;

/** Parse helpers — throw a ZodError on malformed content (dev-loud). */
export const parseManifest = (raw: unknown): ManifestFile => manifestSchema.parse(raw);
export const parseLevel = (raw: unknown): LevelFile => levelFileSchema.parse(raw);
export const parseModuleFile = (raw: unknown): ModuleFile => moduleFileSchema.parse(raw);
export const parseVocab = (raw: unknown) => vocabFileSchema.parse(raw);
export const parseGrammar = (raw: unknown) => grammarFileSchema.parse(raw);

/* ---- mock exam ---- */

const speakingTaskSchema = z.object({ cue: z.string(), modelDe: z.string(), en: z.string().optional() });

export const examSectionSchema = z.object({
  id: z.string(),
  skill: z.enum(['hoeren', 'lesen', 'schreiben', 'sprechen']),
  title: z.string(),
  instructions: z.string().optional(),
  graded: z.boolean(),
  items: z.array(exerciseSchema).optional(),
  speakingTasks: z.array(speakingTaskSchema).optional(),
});

export const examFileSchema = z.object({
  id: z.string(),
  level: z.string(),
  title: z.string(),
  passPct: z.number(),
  sections: z.array(examSectionSchema).min(1),
});

export type ExamFile = z.infer<typeof examFileSchema>;
export type ExamSection = z.infer<typeof examSectionSchema>;
export const parseExam = (raw: unknown): ExamFile => examFileSchema.parse(raw);
