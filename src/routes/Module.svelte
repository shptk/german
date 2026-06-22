<script lang="ts">
  import { app, lessonStatus } from '$lib/stores/store.svelte';
  import { navigate, pathParam } from '$lib/router/router.svelte';

  const id = $derived(pathParam(1));
  const mod = $derived(app.content?.modules.get(id));
</script>

{#if mod}
  <header>
    <button class="back" onclick={() => navigate('/map')}>← Map</button>
    <h1>{mod.title}</h1>
  </header>

  <ol class="lessons">
    {#each mod.lessons as l (l.id)}
      {@const done = lessonStatus(l.id) === 'done'}
      <li>
        <button class="lesson" class:done onclick={() => navigate('/lesson/' + l.id)}>
          <span class="ring" class:done>{done ? '✓' : '○'}</span>
          <span class="title">{l.title}</span>
          <span class="meta">{l.estMinutes} min</span>
        </button>
      </li>
    {/each}
  </ol>
{:else}
  <p>Module not found.</p>
{/if}

<style>
  .back {
    border: none;
    background: none;
    color: var(--accent);
    padding: 0;
    margin-bottom: var(--s-2);
    font: var(--t-small);
  }
  .lessons {
    list-style: none;
    margin: var(--s-4) 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }
  .lesson {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--s-3);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: var(--s-3) var(--s-4);
    min-height: var(--tap-min);
    color: var(--text);
    text-align: left;
  }
  .ring {
    width: 28px;
    text-align: center;
    color: var(--text-muted);
  }
  .ring.done {
    color: var(--success);
  }
  .title {
    flex: 1;
  }
  .meta {
    color: var(--text-muted);
    font: var(--t-small);
  }
</style>
