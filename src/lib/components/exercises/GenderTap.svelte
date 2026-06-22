<script lang="ts">
  import type { Article, ContentDb, GenderTap, Response, Verdict } from '$engine/index';
  import SpeakChip from '$lib/components/ui/SpeakChip.svelte';

  let {
    exercise,
    db,
    locked,
    verdict,
    onResponse,
  }: { exercise: GenderTap; db: ContentDb; locked: boolean; verdict: Verdict | null; onResponse: (r: Response) => void } = $props();

  const vocab = $derived(db.vocab[exercise.vocabRefs[0]]);
  const correct = $derived(verdict?.expected?.[0] as Article | undefined);
  let choice = $state<Article | null>(null);

  function pick(a: Article) {
    if (locked) return;
    choice = a;
    onResponse({ option: a });
  }
</script>

<div class="prompt-line">
  <span class="lang-de">{vocab?.lemma}</span>
  {#if vocab}<SpeakChip text={`${(correct ?? vocab.article ?? '').toString()} ${vocab.lemma}`.trim()} />{/if}
</div>

<div class="pills">
  {#each ['der', 'die', 'das'] as const as a (a)}
    <button
      class="pill"
      class:sel={choice === a}
      class:ok={locked && a === correct}
      class:bad={locked && choice === a && a !== correct}
      disabled={locked}
      onclick={() => pick(a)}
    >
      {a}
    </button>
  {/each}
</div>

<style>
  .prompt-line {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-3);
    margin: var(--s-5) 0;
  }
  .pills {
    display: flex;
    gap: var(--s-3);
  }
  .pill {
    flex: 1;
    min-height: 56px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--surface-2);
    color: var(--text);
    font: var(--t-h2);
  }
  .pill.sel {
    border-color: var(--accent);
    background: var(--accent-weak);
    color: var(--accent);
  }
  .pill.ok {
    border-color: var(--success);
    background: color-mix(in srgb, var(--success) 14%, transparent);
    color: var(--success);
  }
  .pill.bad {
    border-color: var(--warn);
    background: color-mix(in srgb, var(--warn) 14%, transparent);
    color: var(--warn);
  }
</style>
