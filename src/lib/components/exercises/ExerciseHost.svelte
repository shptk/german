<script lang="ts">
  import type { ContentDb, Exercise, Grade, Response, Verdict } from '$engine/index';
  import { checkExercise, deriveGrade } from '$engine/index';
  import { speak } from '$lib/audio/tts';
  import { app } from '$lib/stores/store.svelte';
  import SpeakChip from '$lib/components/ui/SpeakChip.svelte';
  import GenderTap from './GenderTap.svelte';
  import MultipleChoice from './MultipleChoice.svelte';
  import Cloze from './Cloze.svelte';
  import Conjugate from './Conjugate.svelte';
  import DragTile from './DragTile.svelte';
  import Match from './Match.svelte';
  import Dictation from './Dictation.svelte';

  let {
    exercise,
    db,
    onComplete,
  }: { exercise: Exercise; db: ContentDb; onComplete: (r: { correct: boolean; grade: Grade }) => void } = $props();

  let response = $state<Response>({});
  let verdict = $state<Verdict | null>(null);
  let attempts = $state(0);
  let startedAt = $state(0);

  const locked = $derived(verdict !== null);

  // Listening items (e.g. Hören MCQ): play audio instead of showing the German text.
  const audioText = $derived((exercise as { audioText?: string }).audioText);
  const isListening = $derived(exercise.skill === 'listening' && !!audioText && exercise.type !== 'dictation');
  function playAudio(rate = 0.9) {
    if (audioText) speak(audioText, { rate, voiceURI: app.state?.settings.ttsVoiceURI });
  }

  function onResponse(r: Response) {
    if (!startedAt) startedAt = performance.now();
    response = r;
  }

  function ready(): boolean {
    const r = response;
    switch (exercise.type) {
      case 'gender-tap':
        return !!r.option;
      case 'mcq':
        return !!r.choiceId;
      case 'conjugate':
      case 'dictation':
        return !!r.text?.trim();
      case 'cloze': {
        const n = exercise.segments.filter((s) => s.kind === 'blank').length;
        return (r.inputs?.filter((x) => x.trim()).length ?? 0) === n;
      }
      case 'drag-tile':
        return (r.placed?.length ?? 0) === exercise.accepted[0].length;
      case 'match':
        return Object.keys(r.pairing ?? {}).length === exercise.pairRefs.length;
    }
  }

  function ceiling(): Grade {
    switch (exercise.type) {
      case 'gender-tap':
      case 'mcq':
      case 'dictation':
      case 'match':
        return 'good';
      case 'cloze':
      case 'conjugate':
        return exercise.inputMode === 'pick' ? 'good' : 'easy';
      case 'drag-tile':
        return 'easy';
    }
  }
  function recognition(): boolean {
    return exercise.type === 'gender-tap' || exercise.type === 'mcq' || exercise.type === 'match';
  }

  const canRetry = $derived(
    locked &&
      verdict?.correct === false &&
      (exercise.type === 'drag-tile' || exercise.type === 'cloze' || exercise.type === 'conjugate'),
  );

  function reveal(): string | null {
    if (!verdict || verdict.correct) return null;
    if (exercise.type === 'mcq' || exercise.type === 'match') return null;
    if (exercise.type === 'gender-tap') {
      const v = db.vocab[exercise.vocabRefs[0]];
      return v ? `${verdict.expected?.[0] ?? ''} ${v.lemma}`.trim() : null;
    }
    return (verdict.expected ?? []).join('  ');
  }

  function check() {
    attempts += 1;
    verdict = checkExercise(exercise, response, db);
  }
  function tryAgain() {
    verdict = null;
  }
  function cont() {
    const ms = startedAt ? performance.now() - startedAt : 0;
    const grade = deriveGrade(
      verdict!.correct,
      { attempts, usedHint: false, ms, expectedMs: exercise.estSeconds * 1000, recognition: recognition() },
      ceiling(),
    );
    onComplete({ correct: verdict!.correct, grade });
  }
</script>

<div class="ex">
  <div class="prompt">
    {#if exercise.prompt?.en}<p class="en">{exercise.prompt.en}</p>{/if}
    {#if exercise.prompt?.de}
      <p class="de"><span class="lang-de">{exercise.prompt.de}</span> <SpeakChip text={exercise.prompt.de} size="sm" /></p>
    {/if}
    {#if isListening}
      <div class="listen">
        <button class="play" type="button" onclick={() => playAudio(0.9)}>▶ Play</button>
        <button class="play slow" type="button" onclick={() => playAudio(0.6)}>🐢 Slower</button>
      </div>
    {/if}
  </div>

  <div class="answer">
    {#if exercise.type === 'gender-tap'}
      <GenderTap {exercise} {db} {locked} {verdict} {onResponse} />
    {:else if exercise.type === 'mcq'}
      <MultipleChoice {exercise} {locked} {verdict} {onResponse} />
    {:else if exercise.type === 'cloze'}
      <Cloze {exercise} {locked} {verdict} {onResponse} />
    {:else if exercise.type === 'conjugate'}
      <Conjugate {exercise} {db} {locked} {verdict} {onResponse} />
    {:else if exercise.type === 'drag-tile'}
      <DragTile {exercise} {locked} {verdict} {onResponse} />
    {:else if exercise.type === 'match'}
      <Match {exercise} {db} {locked} {verdict} {onResponse} />
    {:else if exercise.type === 'dictation'}
      <Dictation {exercise} {locked} {verdict} {onResponse} />
    {/if}
  </div>

  {#if verdict}
    <div class="feedback" class:correct={verdict.correct} class:wrong={!verdict.correct} role="status" aria-live="polite">
      {#if verdict.correct}
        <span>Richtig! ✓</span>
      {:else}
        <span>Not quite.</span>
        {#if reveal()}<span class="rev lang-de">{reveal()}</span><SpeakChip text={reveal() ?? ''} size="sm" />{/if}
      {/if}
    </div>
  {/if}

  <div class="bar">
    {#if !locked}
      <button class="primary" disabled={!ready()} onclick={check}>Check</button>
    {:else}
      {#if canRetry}<button class="ghost" onclick={tryAgain}>Try again</button>{/if}
      <button class="primary" class:good={verdict?.correct} onclick={cont}>
        {verdict?.correct ? 'Continue' : 'Got it'}
      </button>
    {/if}
  </div>
</div>

<style>
  .ex {
    display: flex;
    flex-direction: column;
    min-height: calc(100dvh - var(--tabbar-h) - var(--safe-b) - var(--s-8));
  }
  .prompt {
    margin-bottom: var(--s-4);
  }
  .en {
    margin: 0 0 var(--s-1);
    color: var(--text-muted);
  }
  .de {
    margin: 0;
    display: flex;
    align-items: center;
    gap: var(--s-2);
  }
  .answer {
    flex: 1;
  }
  .listen {
    display: flex;
    gap: var(--s-3);
    margin: var(--s-3) 0;
  }
  .play {
    min-height: 44px;
    padding: 0 var(--s-4);
    border: 1px solid var(--border);
    border-radius: var(--r-pill);
    background: var(--accent-weak);
    color: var(--accent);
    font: var(--t-body);
  }
  .feedback {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    flex-wrap: wrap;
    padding: var(--s-3) var(--s-4);
    border-radius: var(--r-md);
    margin: var(--s-3) 0;
    font: var(--t-small);
  }
  .feedback.correct {
    background: color-mix(in srgb, var(--success) 14%, transparent);
    color: var(--success);
  }
  .feedback.wrong {
    background: color-mix(in srgb, var(--warn) 14%, transparent);
    color: var(--warn);
  }
  .rev {
    color: var(--text);
    font-weight: 600;
  }
  .bar {
    position: sticky;
    bottom: 0;
    display: flex;
    gap: var(--s-3);
    padding-top: var(--s-3);
  }
  .primary {
    flex: 1;
    min-height: 52px;
    border: none;
    border-radius: var(--r-pill);
    background: var(--accent);
    color: var(--on-accent);
    font: var(--t-h2);
  }
  .primary:disabled {
    opacity: 0.4;
  }
  .primary.good {
    background: var(--success);
  }
  .ghost {
    min-height: 52px;
    padding: 0 var(--s-5);
    border: 1px solid var(--border);
    border-radius: var(--r-pill);
    background: var(--surface);
    color: var(--text);
    font: var(--t-body);
  }
</style>
