<script lang="ts">
  import type { Cloze, Response, Verdict } from '$engine/index';
  import UmlautBar from '$lib/components/ui/UmlautBar.svelte';

  let {
    exercise,
    locked,
    verdict,
    onResponse,
  }: { exercise: Cloze; locked: boolean; verdict: Verdict | null; onResponse: (r: Response) => void } = $props();

  // index among blanks for each segment (-1 for text)
  const segBlank: number[] = (() => {
    let b = 0;
    return exercise.segments.map((s) => (s.kind === 'blank' ? b++ : -1));
  })();
  const blankCount = segBlank.filter((i) => i >= 0).length;

  let inputs = $state<string[]>(Array.from({ length: blankCount }, () => ''));
  let focused = $state(0);

  function set(i: number, v: string) {
    inputs[i] = v;
    onResponse({ inputs: [...inputs] });
  }
</script>

<p class="sentence">
  {#each exercise.segments as seg, si (si)}
    {#if seg.kind === 'text'}<span class="lang-de">{seg.value}</span>{:else}
      {#if exercise.inputMode === 'type'}
        <input
          class="blank lang-de"
          class:ok={locked && verdict?.perSlot?.[segBlank[si]]}
          class:bad={locked && verdict && verdict.perSlot?.[segBlank[si]] === false}
          value={inputs[segBlank[si]]}
          disabled={locked}
          onfocus={() => (focused = segBlank[si])}
          oninput={(e) => set(segBlank[si], e.currentTarget.value)}
          size="7"
        />
      {:else}
        <span class="blank-pick" class:filled={!!inputs[segBlank[si]]}>{inputs[segBlank[si]] || '_____'}</span>
      {/if}
    {/if}
  {/each}
</p>

{#if !locked}
  {#if exercise.inputMode === 'pick'}
    <div class="bank">
      {#each exercise.bank ?? [] as opt (opt)}
        <button type="button" class="chip lang-de" onclick={() => set(focused, opt)}>{opt}</button>
      {/each}
    </div>
  {:else}
    <UmlautBar onInsert={(c) => set(focused, inputs[focused] + c)} />
  {/if}
{/if}

<style>
  .sentence {
    font: var(--t-german);
    line-height: 2.2;
    color: var(--text);
    margin: var(--s-4) 0;
  }
  .blank {
    display: inline-block;
    min-width: 5ch;
    padding: 2px var(--s-2);
    border: none;
    border-bottom: 2px solid var(--accent);
    background: var(--accent-weak);
    color: var(--text);
    border-radius: var(--r-sm) var(--r-sm) 0 0;
    font: inherit;
  }
  .blank.ok {
    border-color: var(--success);
    background: color-mix(in srgb, var(--success) 14%, transparent);
  }
  .blank.bad {
    border-color: var(--warn);
    background: color-mix(in srgb, var(--warn) 14%, transparent);
  }
  .blank-pick {
    border-bottom: 2px solid var(--accent);
    padding: 0 var(--s-2);
    color: var(--text-muted);
  }
  .blank-pick.filled {
    color: var(--text);
  }
  .bank {
    display: flex;
    gap: var(--s-2);
    flex-wrap: wrap;
  }
  .chip {
    min-height: 40px;
    padding: 0 var(--s-4);
    border: 1px solid var(--border);
    border-radius: var(--r-pill);
    background: var(--surface-2);
    color: var(--text);
  }
</style>
