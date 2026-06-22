<script lang="ts">
  import { route, segment } from '$lib/router/router.svelte';
  import { app } from '$lib/stores/store.svelte';
  import Tabbar from '$lib/components/ui/Tabbar.svelte';
  import UpdateToast from '$lib/components/ui/UpdateToast.svelte';
  import Today from './routes/Today.svelte';
  import MapView from './routes/Map.svelte';
  import Module from './routes/Module.svelte';
  import Lesson from './routes/Lesson.svelte';
  import You from './routes/You.svelte';
  import Session from './routes/Session.svelte';
  import Exam from './routes/Exam.svelte';
  import NotFound from './routes/NotFound.svelte';

  // Route table (the only place routes are mapped). Capitalized => renders as a component.
  const Current = $derived.by(() => {
    switch (segment(route.path)) {
      case 'today':
        return Today;
      case 'map':
        return MapView;
      case 'module':
        return Module;
      case 'lesson':
        return Lesson;
      case 'you':
        return You;
      case 'session':
        return Session;
      case 'exam':
        return Exam;
      default:
        return NotFound;
    }
  });

  // The bottom bar hides during focused play (the Check bar owns the thumb zone).
  const showTabbar = $derived(!['session', 'lesson'].includes(segment(route.path)));
</script>

{#if app.loading}
  <div class="boot" role="status" aria-live="polite">
    <div class="spinner" aria-hidden="true"></div>
    <p>Loading…</p>
  </div>
{:else if app.error}
  <div class="boot">
    <h1>Something went wrong</h1>
    <p>{app.error}</p>
  </div>
{:else}
  <div class="app-frame">
    <main class="app-main">
      {#key route.path}
        <Current />
      {/key}
    </main>
    {#if showTabbar}<Tabbar />{/if}
  </div>
  <UpdateToast />
{/if}

<style>
  .boot {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--s-4);
    padding: var(--s-5);
    text-align: center;
  }
  .spinner {
    width: 32px;
    height: 32px;
    border-radius: var(--r-pill);
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
    }
  }
</style>
