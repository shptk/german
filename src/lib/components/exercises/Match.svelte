<script lang="ts">
  import { untrack } from 'svelte';
  import type { ContentDb, Match, Response, Verdict } from '$engine/index';
  import SpeakChip from '$lib/components/ui/SpeakChip.svelte';

  let {
    exercise,
    db,
    locked,
    verdict,
    onResponse,
  }: { exercise: Match; db: ContentDb; locked: boolean; verdict: Verdict | null; onResponse: (r: Response) => void } = $props();

  function shuffle<T>(a: T[]): T[] {
    const r = [...a];
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }
  const lemma = (id: string) => db.vocab[id]?.lemma ?? id;
  const gloss = (id: string) => db.vocab[id]?.gloss?.[0] ?? id;

  const lefts = untrack(() => exercise.pairRefs);
  const rights = untrack(() => shuffle(exercise.pairRefs));

  let pairing = $state<Record<string, string>>({});
  let selectedLeft = $state<string | null>(null);

  const wrong = $derived(new Set(verdict?.wrongRefs ?? []));

  function tapLeft(id: string) {
    if (locked || id in pairing) return;
    selectedLeft = selectedLeft === id ? null : id;
  }
  function tapRight(rid: string) {
    if (locked || !selectedLeft || Object.values(pairing).includes(rid)) return;
    pairing = { ...pairing, [selectedLeft]: rid };
    selectedLeft = null;
    onResponse({ pairing });
  }
</script>

<div class="grid">
  <div class="col">
    {#each lefts as id (id)}
      <button
        type="button"
        class="cell left"
        class:sel={selectedLeft === id}
        class:linked={id in pairing}
        class:bad={locked && wrong.has(id)}
        class:ok={locked && id in pairing && !wrong.has(id)}
        disabled={locked || id in pairing}
        onclick={() => tapLeft(id)}
      >
        <span class="lang-de">{lemma(id)}</span>
        <SpeakChip text={`${db.vocab[id]?.article ?? ''} ${lemma(id)}`.trim()} size="sm" />
      </button>
    {/each}
  </div>
  <div class="col">
    {#each rights as id (id)}
      <button
        type="button"
        class="cell right"
        class:linked={Object.values(pairing).includes(id)}
        disabled={locked || Object.values(pairing).includes(id)}
        onclick={() => tapRight(id)}
      >
        {gloss(id)}
      </button>
    {/each}
  </div>
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s-3);
    margin-top: var(--s-3);
  }
  .col {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }
  .cell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-2);
    min-height: var(--tap-min);
    padding: var(--s-3);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--surface);
    color: var(--text);
    text-align: left;
  }
  .cell.sel {
    border-color: var(--accent);
    background: var(--accent-weak);
  }
  .cell.linked {
    opacity: 0.55;
  }
  .cell.ok {
    border-color: var(--success);
  }
  .cell.bad {
    border-color: var(--warn);
  }
</style>
