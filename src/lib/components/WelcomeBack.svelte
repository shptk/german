<script lang="ts">
  import { app, getCatchup, setCustomDate } from '$lib/stores/store.svelte';
  import { daysBetween } from '$engine/index';
  import { navigate } from '$lib/router/router.svelte';

  let { onDismiss }: { onDismiss: () => void } = $props();

  const decision = getCatchup();
  const last = app.state?.streak.lastActiveDayKey ?? null;
  const awayDays = $derived(last ? Math.max(1, daysBetween(last, todayKeyish())) : 1);
  let choice = $state<'keep' | 'push'>(decision?.kind === 'push' ? 'push' : 'keep');
  let busy = $state(false);

  function todayKeyish(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async function start() {
    busy = true;
    if (choice === 'push' && decision?.newTargetDayKey) await setCustomDate(decision.newTargetDayKey);
    busy = false;
    onDismiss();
    navigate('/session');
  }
</script>

<section class="card">
  <h2>Willkommen zurück! 👋</h2>
  <p class="muted">You were away {awayDays} {awayDays === 1 ? 'day' : 'days'} — your streak is safe and nothing was lost.</p>

  {#if decision && decision.kind !== 'none'}
    <p class="lead">We'll resurface what you missed first, then:</p>
    <label class="opt" class:sel={choice === 'keep'}>
      <input type="radio" bind:group={choice} value="keep" />
      <span><strong>Keep your date</strong> — days get a bit busier (~{decision.projectedDailyMin} min).</span>
    </label>
    {#if decision.newTargetDayKey}
      <label class="opt" class:sel={choice === 'push'}>
        <input type="radio" bind:group={choice} value="push" />
        <span><strong>Move my date to {decision.newTargetDayKey}</strong> — stay relaxed.</span>
      </label>
    {/if}
  {/if}

  <div class="actions">
    <button class="primary" disabled={busy} onclick={start}>Start catch-up</button>
    <button class="ghost" onclick={onDismiss}>Maybe later</button>
  </div>
</section>

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--accent);
    border-radius: var(--r-lg);
    padding: var(--s-5);
    box-shadow: var(--shadow-1);
    margin-bottom: var(--s-4);
  }
  h2 {
    margin: 0 0 var(--s-2);
  }
  .muted {
    margin: 0 0 var(--s-3);
  }
  .lead {
    margin: 0 0 var(--s-2);
    color: var(--text);
  }
  .opt {
    display: flex;
    gap: var(--s-2);
    align-items: flex-start;
    padding: var(--s-3);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    margin-bottom: var(--s-2);
  }
  .opt.sel {
    border-color: var(--accent);
    background: var(--accent-weak);
  }
  .actions {
    display: flex;
    gap: var(--s-3);
    margin-top: var(--s-3);
  }
  .primary {
    flex: 1;
    min-height: var(--tap-min);
    border: none;
    border-radius: var(--r-pill);
    background: var(--accent);
    color: var(--on-accent);
    font: var(--t-body);
  }
  .ghost {
    min-height: var(--tap-min);
    padding: 0 var(--s-4);
    border: 1px solid var(--border);
    border-radius: var(--r-pill);
    background: var(--surface);
    color: var(--text);
  }
</style>
