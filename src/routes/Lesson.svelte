<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '$lib/stores/store.svelte';
  import { buildLessonSession, type SessionItem } from '$lib/session/session';
  import { navigate, pathParam } from '$lib/router/router.svelte';
  import SessionRunner from '$lib/components/SessionRunner.svelte';

  const id = pathParam(1);
  let items = $state<SessionItem[]>([]);
  let done = $state(false);

  function moduleId(): string | null {
    for (const m of app.content?.modules.values() ?? []) {
      if (m.lessons.some((l) => l.id === id)) return m.id;
    }
    return null;
  }
  function back() {
    const m = moduleId();
    navigate(m ? '/module/' + m : '/map');
  }

  onMount(() => {
    if (app.content) items = buildLessonSession(id, app.content);
    if (items.length === 0) done = true;
  });
</script>

{#if done}
  <div class="complete">
    <p class="emoji" aria-hidden="true">🎉</p>
    <h1>Lesson complete</h1>
    <button class="primary" onclick={back}>Back</button>
  </div>
{:else if items.length}
  <SessionRunner {items} db={app.content!.db} onDone={() => (done = true)} />
{/if}

<style>
  .complete {
    min-height: 60dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: var(--s-3);
  }
  .emoji {
    font-size: 3rem;
    margin: 0;
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
