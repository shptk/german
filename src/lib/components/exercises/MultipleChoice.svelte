<script lang="ts">
  import type { Mcq, Response, Verdict } from '$engine/index';
  import SpeakChip from '$lib/components/ui/SpeakChip.svelte';

  let {
    exercise,
    locked,
    verdict,
    onResponse,
  }: { exercise: Mcq; locked: boolean; verdict: Verdict | null; onResponse: (r: Response) => void } = $props();

  const correct = $derived(verdict?.expected?.[0]);
  let chosen = $state<string | null>(null);

  function pick(id: string) {
    if (locked) return;
    chosen = id;
    onResponse({ choiceId: id });
  }
</script>

{#if exercise.passage?.de}
  <div class="passage">
    <span class="lang-de">{exercise.passage.de}</span>
    <SpeakChip text={exercise.passage.de} size="sm" />
  </div>
{/if}

<div class="choices">
  {#each exercise.choices as c (c.id)}
    <button
      class="choice"
      class:sel={chosen === c.id}
      class:ok={locked && c.id === correct}
      class:bad={locked && chosen === c.id && c.id !== correct}
      disabled={locked}
      onclick={() => pick(c.id)}
    >
      <span class:lang-de={!!c.text.de}>{c.text.de ?? c.text.en}</span>
      {#if c.text.de}<SpeakChip text={c.text.de} size="sm" />{/if}
    </button>
  {/each}
</div>

<style>
  .passage {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    background: var(--surface-2);
    border-radius: var(--r-md);
    padding: var(--s-4);
    margin-bottom: var(--s-4);
  }
  .choices {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
  }
  .choice {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
    text-align: left;
    min-height: var(--tap-min);
    padding: var(--s-4);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--surface);
    color: var(--text);
    font: var(--t-body);
  }
  .choice.sel {
    border-color: var(--accent);
    background: var(--accent-weak);
  }
  .choice.ok {
    border-color: var(--success);
    background: color-mix(in srgb, var(--success) 14%, transparent);
  }
  .choice.bad {
    border-color: var(--warn);
    background: color-mix(in srgb, var(--warn) 14%, transparent);
  }
</style>
