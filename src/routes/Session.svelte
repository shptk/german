<script lang="ts">
  import { onMount } from 'svelte';
  import { app, getTodayQueue } from '$lib/stores/store.svelte';
  import { buildSession, type SessionItem } from '$lib/session/session';
  import { navigate } from '$lib/router/router.svelte';
  import SessionRunner from '$lib/components/SessionRunner.svelte';

  let items = $state<SessionItem[]>([]);
  let done = $state(false);

  onMount(() => {
    const q = getTodayQueue();
    if (app.content && q) items = buildSession(q, app.content);
    if (items.length === 0) done = true;
  });
</script>

{#if done}
  <div class="complete">
    <p class="emoji" aria-hidden="true">🎉</p>
    <h1>Session complete</h1>
    <p>Nice work — your progress is saved.</p>
    <button class="primary" onclick={() => navigate('/today')}>Back to Today</button>
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
