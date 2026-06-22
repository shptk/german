<script lang="ts">
  import { app, moduleStats, nextRecommendedLessonId } from '$lib/stores/store.svelte';
  import { navigate } from '$lib/router/router.svelte';

  const order = $derived(app.content?.level.moduleOrder ?? []);
  const nextLesson = $derived(nextRecommendedLessonId());

  function moduleOfLesson(lessonId: string): string | null {
    for (const m of app.content?.modules.values() ?? []) {
      if (m.lessons.some((l) => l.id === lessonId)) return m.id;
    }
    return null;
  }
  const nextModule = $derived(nextLesson ? moduleOfLesson(nextLesson) : null);
  const complete = $derived(!nextLesson);
</script>

<header>
  <h1>Map</h1>
  <p>All of A1, always unlocked. The journey ends at the mock exam 🏁</p>
</header>

<ol class="path" aria-label="A1 modules">
  {#each order as id, i (id)}
    {@const m = app.content?.modules.get(id)}
    {@const st = moduleStats(id)}
    {@const isDone = st.total > 0 && st.done === st.total}
    <li>
      <button
        class="node"
        class:done={isDone}
        class:started={st.done > 0 && !isDone}
        class:next={id === nextModule}
        onclick={() => navigate('/module/' + id)}
      >
        <span class="dot">{isDone ? '✓' : i + 1}</span>
        <span class="name">{m?.title}</span>
        <span class="meta">
          {#if id === nextModule}▸ {/if}{st.done}/{st.total}
        </span>
      </button>
    </li>
  {/each}
  <li>
    <button class="node finish" class:ready={complete} onclick={() => navigate('/exam')}>
      <span class="dot">🏁</span>
      <span class="name">Start Deutsch 1 — mock exam</span>
      <span class="meta">{complete ? 'ready' : 'preview'}</span>
    </button>
  </li>
</ol>

<style>
  .path {
    list-style: none;
    margin: var(--s-4) 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }
  .node {
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
  .dot {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    flex: none;
    border-radius: var(--r-pill);
    background: var(--surface-2);
    color: var(--text-muted);
    font: var(--t-small);
  }
  .name {
    flex: 1;
  }
  .meta {
    color: var(--text-muted);
    font: var(--t-small);
  }
  .node.done .dot {
    background: color-mix(in srgb, var(--success) 18%, transparent);
    color: var(--success);
  }
  .node.next {
    border-color: var(--accent);
  }
  .node.next .meta {
    color: var(--accent);
  }
  .finish {
    border-color: var(--accent);
    background: var(--accent-weak);
  }
</style>
