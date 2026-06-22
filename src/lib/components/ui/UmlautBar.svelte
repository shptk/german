<script lang="ts">
  let { onInsert }: { onInsert: (ch: string) => void } = $props();
  const chars = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'];
</script>

<div class="umlauts" role="group" aria-label="German special characters">
  {#each chars as c (c)}
    <button type="button" onclick={() => onInsert(c)}>{c}</button>
  {/each}
</div>

<style>
  .umlauts {
    display: flex;
    gap: var(--s-2);
    flex-wrap: wrap;
    margin-top: var(--s-2);
  }
  button {
    min-width: 40px;
    min-height: 40px;
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    background: var(--surface-2);
    color: var(--text);
    font: var(--t-german);
  }
</style>
