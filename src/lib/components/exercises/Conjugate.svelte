<script lang="ts">
  import type { Conjugate, ContentDb, Response, Verdict } from '$engine/index';
  import UmlautBar from '$lib/components/ui/UmlautBar.svelte';

  let {
    exercise,
    db,
    locked,
    verdict,
    onResponse,
  }: { exercise: Conjugate; db: ContentDb; locked: boolean; verdict: Verdict | null; onResponse: (r: Response) => void } = $props();

  const verb = $derived(db.vocab[exercise.verbRef]);
  let value = $state('');
  function set(v: string) {
    value = v;
    onResponse({ text: v });
  }
</script>

<div class="cue">
  <span class="lang-de lemma">{verb?.lemma}</span>
  <span class="arrow">→</span>
  <span class="person">{exercise.tense === 'imperativ' ? `${exercise.person} (imperative)` : exercise.person}</span>
</div>

<input
  class="field lang-de"
  class:ok={locked && verdict?.correct}
  class:bad={locked && verdict && !verdict.correct}
  value={value}
  disabled={locked}
  oninput={(e) => set(e.currentTarget.value)}
  autocomplete="off"
  autocapitalize="off"
  spellcheck="false"
  placeholder="…"
/>
{#if !locked}<UmlautBar onInsert={(c) => set(value + c)} />{/if}

<style>
  .cue {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    justify-content: center;
    margin: var(--s-4) 0;
  }
  .lemma {
    font: var(--t-h2);
  }
  .arrow,
  .person {
    color: var(--text-muted);
  }
  .field {
    width: 100%;
    padding: var(--s-3) var(--s-4);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--surface);
    color: var(--text);
  }
  .field.ok {
    border-color: var(--success);
  }
  .field.bad {
    border-color: var(--warn);
  }
</style>
