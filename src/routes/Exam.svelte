<script lang="ts">
  import { navigate } from '$lib/router/router.svelte';
  import { nextRecommendedLessonId } from '$lib/stores/store.svelte';

  const complete = $derived(!nextRecommendedLessonId());
</script>

<header>
  <h1>Start Deutsch 1 — mock exam</h1>
</header>

<section class="card">
  {#if complete}
    <p>You've finished the course — the full graded mock exam is being built and unlocks here.</p>
  {:else}
    <p class="muted">Finish the A1 path to unlock the full graded mock exam (Hören · Lesen · Schreiben), with a speaking self-check. The real Start Deutsch 1 also includes a human-graded speaking score.</p>
  {/if}
  <button class="primary" onclick={() => navigate('/map')}>Back to map</button>
</section>

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: var(--s-5);
    box-shadow: var(--shadow-1);
  }
  .muted {
    color: var(--text-muted);
  }
  .primary {
    margin-top: var(--s-4);
    min-height: var(--tap-min);
    padding: 0 var(--s-5);
    border: none;
    border-radius: var(--r-pill);
    background: var(--accent);
    color: var(--on-accent);
  }
</style>
