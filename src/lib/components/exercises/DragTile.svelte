<script lang="ts">
  import { untrack } from 'svelte';
  import type { DragTile, Response, Verdict } from '$engine/index';

  let {
    exercise,
    locked,
    verdict,
    onResponse,
  }: { exercise: DragTile; locked: boolean; verdict: Verdict | null; onResponse: (r: Response) => void } = $props();

  interface Tile {
    id: number;
    t: string;
  }
  function shuffle<T>(a: T[]): T[] {
    const r = [...a];
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }

  // tap-to-place is primary (drag is an optional enhancement we omit for reliability).
  // untrack: the shuffled pool is seeded once; `exercise` is stable for this component's life.
  let tray = $state<Tile[]>(
    untrack(() => shuffle([...exercise.tiles, ...(exercise.distractorTiles ?? [])]).map((t, id) => ({ id, t }))),
  );
  let line = $state<Tile[]>([]);

  function emit() {
    onResponse({ placed: line.map((x) => x.t) });
  }
  function place(tile: Tile) {
    if (locked) return;
    tray = tray.filter((x) => x.id !== tile.id);
    line = [...line, tile];
    emit();
  }
  function unplace(tile: Tile) {
    if (locked) return;
    line = line.filter((x) => x.id !== tile.id);
    tray = [...tray, tile];
    emit();
  }
</script>

{#if exercise.translationEn}<p class="gloss">{exercise.translationEn}</p>{/if}

<div class="line" class:ok={locked && verdict?.correct} class:bad={locked && verdict && !verdict.correct}>
  {#if line.length === 0}<span class="ph">Tap words to build the sentence</span>{/if}
  {#each line as tile (tile.id)}
    <button type="button" class="tile lang-de" disabled={locked} onclick={() => unplace(tile)}>{tile.t}</button>
  {/each}
</div>

<div class="tray">
  {#each tray as tile (tile.id)}
    <button type="button" class="tile lang-de" disabled={locked} onclick={() => place(tile)}>{tile.t}</button>
  {/each}
</div>

<style>
  .gloss {
    text-align: center;
    color: var(--text-muted);
    margin: 0 0 var(--s-4);
  }
  .line {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
    min-height: 56px;
    align-items: center;
    padding: var(--s-3);
    border: 1px dashed var(--border);
    border-radius: var(--r-md);
    margin-bottom: var(--s-4);
  }
  .line.ok {
    border-style: solid;
    border-color: var(--success);
  }
  .line.bad {
    border-style: solid;
    border-color: var(--warn);
  }
  .ph {
    color: var(--text-muted);
    font: var(--t-small);
  }
  .tray {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
    justify-content: center;
  }
  .tile {
    padding: var(--s-2) var(--s-4);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--surface-2);
    color: var(--text);
    font: var(--t-german);
  }
</style>
