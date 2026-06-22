<script lang="ts">
  import { app, nextRecommendedLessonId } from '$lib/stores/store.svelte';
  import { navigate } from '$lib/router/router.svelte';
  import { hasGermanVoice } from '$lib/audio/tts';
  import ExamRunner from '$lib/components/ExamRunner.svelte';

  const exam = $derived(app.content?.exam ?? null);
  const complete = $derived(!nextRecommendedLessonId());
  const voice = hasGermanVoice();
  let started = $state(false);

  const SKILL_LABEL: Record<string, string> = { hoeren: 'Hören', lesen: 'Lesen', schreiben: 'Schreiben', sprechen: 'Sprechen' };
</script>

{#if !exam}
  <header><h1>Mock exam</h1></header>
  <section class="card"><p class="muted">The mock exam isn't available yet.</p><button class="primary" onclick={() => navigate('/map')}>Back</button></section>
{:else if started}
  <ExamRunner {exam} db={app.content!.db} onExit={() => navigate('/map')} />
{:else}
  <header><h1>{exam.title}</h1></header>
  <section class="card">
    {#if !complete}
      <p class="banner">Practice run — finish the course to take it as your real readiness check.</p>
    {/if}
    <ul class="sections">
      {#each exam.sections as s (s.id)}
        <li>{SKILL_LABEL[s.skill] ?? s.title} — {s.graded ? `${s.items?.length ?? 0} items` : 'self-check'}</li>
      {/each}
    </ul>
    {#if !voice}
      <p class="warn">No German voice on this device — the Hören (listening) section can't play audio here.</p>
    {/if}
    <p class="caveat">Pass mark {exam.passPct}/100 across Hören · Lesen · Schreiben. Speaking is an ungraded self-check.</p>
    <div class="row">
      <button class="primary" onclick={() => (started = true)}>Start exam</button>
      <button class="ghost" onclick={() => navigate('/map')}>Back</button>
    </div>
  </section>
{/if}

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
  .banner {
    background: var(--accent-weak);
    color: var(--accent);
    border-radius: var(--r-md);
    padding: var(--s-3);
    font: var(--t-small);
    margin: 0 0 var(--s-3);
  }
  .sections {
    margin: 0 0 var(--s-4);
    padding-left: var(--s-5);
  }
  .warn {
    color: var(--warn);
    font: var(--t-small);
  }
  .caveat {
    color: var(--text-muted);
    font: var(--t-small);
  }
  .row {
    display: flex;
    gap: var(--s-3);
    margin-top: var(--s-4);
  }
  .primary {
    min-height: 52px;
    padding: 0 var(--s-6);
    border: none;
    border-radius: var(--r-pill);
    background: var(--accent);
    color: var(--on-accent);
    font: var(--t-h2);
  }
  .ghost {
    min-height: 52px;
    padding: 0 var(--s-5);
    border: 1px solid var(--border);
    border-radius: var(--r-pill);
    background: var(--surface);
    color: var(--text);
  }
</style>
