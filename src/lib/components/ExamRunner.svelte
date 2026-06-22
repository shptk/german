<script lang="ts">
  import { untrack } from 'svelte';
  import type { ContentDb, Exercise } from '$engine/index';
  import type { ExamFile } from '$content/index';
  import ExerciseHost from '$lib/components/exercises/ExerciseHost.svelte';
  import { app } from '$lib/stores/store.svelte';
  import { speak } from '$lib/audio/tts';

  let { exam, db, onExit }: { exam: ExamFile; db: ContentDb; onExit: () => void } = $props();

  type SkillKey = 'hoeren' | 'lesen' | 'schreiben';
  const SKILL_LABEL: Record<string, string> = { hoeren: 'Hören', lesen: 'Lesen', schreiben: 'Schreiben', sprechen: 'Sprechen' };

  // exam is stable for this component's life; snapshot derived lists once.
  const graded = untrack(() =>
    exam.sections
      .filter((s) => s.graded && s.items?.length)
      .flatMap((s) => (s.items ?? []).map((ex) => ({ skill: s.skill as SkillKey, exercise: ex as Exercise }))),
  );
  const sprechen = untrack(() => exam.sections.find((s) => s.skill === 'sprechen'));

  let phase = $state<'graded' | 'speaking' | 'results'>(graded.length ? 'graded' : sprechen ? 'speaking' : 'results');
  let i = $state(0);
  const scores: Record<SkillKey, { correct: number; total: number }> = {
    hoeren: { correct: 0, total: 0 },
    lesen: { correct: 0, total: 0 },
    schreiben: { correct: 0, total: 0 },
  };
  const spokenDone = $state<Record<number, boolean>>({});

  function onItem(result: { correct: boolean }) {
    const sk = graded[i].skill;
    scores[sk].total += 1;
    if (result.correct) scores[sk].correct += 1;
    if (i + 1 >= graded.length) phase = sprechen ? 'speaking' : 'results';
    else i += 1;
  }

  function pct(s: { correct: number; total: number }): number {
    return s.total ? Math.round((s.correct / s.total) * 100) : 0;
  }
  const overall = $derived.by(() => {
    const used = (['hoeren', 'lesen', 'schreiben'] as SkillKey[]).filter((k) => scores[k].total > 0);
    if (!used.length) return 0;
    return Math.round(used.reduce((a, k) => a + pct(scores[k]), 0) / used.length);
  });
  const passed = $derived(overall >= exam.passPct);
</script>

{#if phase === 'graded'}
  <div class="bar-top">
    <span>{SKILL_LABEL[graded[i].skill]}</span>
    <span>{i + 1} / {graded.length}</span>
  </div>
  {#key i}
    <ExerciseHost exercise={graded[i].exercise} {db} onComplete={onItem} />
  {/key}
{:else if phase === 'speaking'}
  <header><h1>Sprechen</h1><p class="muted">{sprechen?.instructions ?? 'Speak each one aloud, then tick it. This part is a self-check — it is not scored.'}</p></header>
  <ol class="tasks">
    {#each sprechen?.speakingTasks ?? [] as t, idx (idx)}
      <li class="task">
        <p class="cue">{t.cue}</p>
        <p class="lang-de model">{t.modelDe}</p>
        <div class="row">
          <button class="ghost" onclick={() => speak(t.modelDe, { voiceURI: app.state?.settings.ttsVoiceURI })}>▶ Hear model</button>
          <label class="tick"><input type="checkbox" bind:checked={spokenDone[idx]} /> I said it</label>
        </div>
      </li>
    {/each}
  </ol>
  <button class="primary" onclick={() => (phase = 'results')}>See results</button>
{:else}
  <header><h1>{passed ? '🎉 Bestanden!' : 'Mock complete'}</h1></header>
  <section class="card">
    <p class="big">{overall}/100 · {passed ? 'Pass' : 'Not yet'} <span class="muted">(pass {exam.passPct})</span></p>
    <ul class="sub">
      {#each ['hoeren', 'lesen', 'schreiben'] as const as k (k)}
        {#if scores[k].total}
          <li>{SKILL_LABEL[k]}: {scores[k].correct}/{scores[k].total} ({pct(scores[k])}%)</li>
        {/if}
      {/each}
    </ul>
    <p class="caveat">
      This mock score covers Hören, Lesen and Schreiben only. The real Start Deutsch 1 also includes a
      human-graded speaking score, so treat this as practice, not a pass prediction.
    </p>
    <button class="primary" onclick={onExit}>Done</button>
  </section>
{/if}

<style>
  .bar-top {
    display: flex;
    justify-content: space-between;
    color: var(--text-muted);
    font: var(--t-small);
    margin-bottom: var(--s-3);
  }
  .muted {
    color: var(--text-muted);
  }
  .tasks {
    list-style: none;
    padding: 0;
    margin: var(--s-4) 0;
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
  }
  .task {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: var(--s-4);
  }
  .cue {
    margin: 0 0 var(--s-1);
    color: var(--text-muted);
    font: var(--t-small);
  }
  .model {
    margin: 0 0 var(--s-3);
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
  }
  .tick {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    font: var(--t-small);
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: var(--s-5);
    box-shadow: var(--shadow-1);
  }
  .big {
    font: var(--t-h1);
    margin: 0 0 var(--s-3);
  }
  .sub {
    margin: 0 0 var(--s-4);
    padding-left: var(--s-5);
    color: var(--text);
  }
  .caveat {
    color: var(--text-muted);
    font: var(--t-small);
  }
  .ghost {
    min-height: 40px;
    padding: 0 var(--s-4);
    border: 1px solid var(--border);
    border-radius: var(--r-pill);
    background: var(--surface-2);
    color: var(--text);
  }
  .primary {
    margin-top: var(--s-4);
    min-height: 52px;
    padding: 0 var(--s-6);
    border: none;
    border-radius: var(--r-pill);
    background: var(--accent);
    color: var(--on-accent);
    font: var(--t-h2);
  }
</style>
