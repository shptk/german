<script lang="ts">
  import { daysBetween, type PaceStatusKind, type PresetId } from '$engine/index';
  import { app, getPace, getTodayQueue, hasPlan, setPlan, todayKey } from '$lib/stores/store.svelte';

  const planned = $derived(hasPlan());
  const queue = $derived(getTodayQueue());
  const pace = $derived(getPace());
  const target = $derived(app.state?.plan?.targetDayKey ?? null);
  const daysLeft = $derived(target ? Math.max(0, daysBetween(todayKey(), target)) : 0);

  const PRESETS: { id: PresetId; label: string; mins: number; blurb: string }[] = [
    { id: 'relaxed', label: 'Relaxed', mins: 10, blurb: 'Gentle — about 10 min/day' },
    { id: 'steady', label: 'Steady', mins: 20, blurb: 'Balanced — about 20 min/day' },
    { id: 'intense', label: 'Intense', mins: 35, blurb: 'Fast — about 35 min/day' },
  ];

  const PACE_LABEL: Record<PaceStatusKind, string> = {
    ahead: 'Ahead',
    onTrack: 'On track',
    behind: 'Behind — catching up',
    paused: 'Paused',
    elapsed: 'Date passed — reschedule',
    done: 'Done!',
  };

  let busy = $state(false);
  async function choose(id: PresetId) {
    busy = true;
    await setPlan({ kind: 'preset', presetId: id });
    busy = false;
  }
</script>

<header>
  <p class="greeting">Guten Tag 👋</p>
  <h1>Today</h1>
</header>

{#if !planned}
  <section class="card">
    <p class="eyebrow">Choose your pace</p>
    <p class="muted">Pick an intensity and we'll set your A1 finish date and a daily plan. You can change it anytime.</p>
    <div class="presets">
      {#each PRESETS as p (p.id)}
        <button class="preset" disabled={busy} onclick={() => choose(p.id)}>
          <span class="preset-label">{p.label}</span>
          <span class="preset-blurb">{p.blurb}</span>
        </button>
      {/each}
    </div>
  </section>
{:else}
  <section class="card countdown">
    <p class="eyebrow">Your A1 date</p>
    <p class="big">{target} · {daysLeft} days left</p>
    {#if pace}
      <span class="pill {pace.kind}">● {PACE_LABEL[pace.kind]}</span>
    {/if}
  </section>

  <section class="card cta">
    <p class="eyebrow">Today's session</p>
    {#if queue}
      <p class="counts">🆕 {queue.newLessons.length} lessons · 🔁 {queue.reviews.length} reviews · ~{Math.round(queue.estMin)} min</p>
      {#if queue.newLessons.length === 0 && queue.reviews.length === 0}
        <p class="muted">All done for today. Nice work! 🎉</p>
      {/if}
    {/if}
    <button class="primary" disabled>Start session</button>
    <p class="note">Playable lessons arrive in the next update — your plan and progress are live now.</p>
  </section>
{/if}

<style>
  .greeting {
    margin: 0;
    color: var(--text-muted);
    font: var(--t-small);
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: var(--s-5);
    box-shadow: var(--shadow-1);
    margin-bottom: var(--s-4);
  }
  .eyebrow {
    margin: 0 0 var(--s-2);
    color: var(--text-muted);
    font: var(--t-small);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .big {
    margin: 0 0 var(--s-2);
    font: var(--t-h2);
    color: var(--text);
  }
  .muted {
    margin: 0;
  }
  .counts {
    margin: 0 0 var(--s-2);
    color: var(--text);
  }
  .presets {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    margin-top: var(--s-4);
  }
  .preset {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    text-align: left;
    padding: var(--s-4);
    min-height: var(--tap-min);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--surface-2);
    color: var(--text);
  }
  .preset:disabled {
    opacity: 0.6;
  }
  .preset-label {
    font: var(--t-h2);
  }
  .preset-blurb {
    color: var(--text-muted);
    font: var(--t-small);
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: var(--s-1);
    padding: var(--s-1) var(--s-3);
    border-radius: var(--r-pill);
    font: var(--t-small);
    background: var(--surface-2);
    color: var(--text-muted);
  }
  .pill.ahead {
    color: var(--success);
  }
  .pill.onTrack {
    color: var(--accent);
  }
  .pill.behind,
  .pill.elapsed {
    color: var(--warn);
  }
  .cta .primary {
    margin-top: var(--s-4);
    width: 100%;
    min-height: var(--tap-min);
    border: none;
    border-radius: var(--r-pill);
    background: var(--accent);
    color: var(--on-accent);
    font: var(--t-h2);
  }
  .cta .primary:disabled {
    opacity: 0.45;
  }
  .note {
    margin: var(--s-3) 0 0;
    font: var(--t-small);
    color: var(--text-muted);
    text-align: center;
  }
</style>
