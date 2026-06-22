<script lang="ts">
  import { daysBetween, type PaceStatusKind, type PresetId } from '$engine/index';
  import {
    app,
    checkCustomDate,
    getPace,
    getTodayQueue,
    hasPlan,
    needsCatchup,
    setCustomDate,
    setPlan,
    todayKey,
  } from '$lib/stores/store.svelte';
  import { navigate } from '$lib/router/router.svelte';
  import WelcomeBack from '$lib/components/WelcomeBack.svelte';

  const planned = $derived(hasPlan());
  const queue = $derived(getTodayQueue());
  const pace = $derived(getPace());
  const target = $derived(app.state?.plan?.targetDayKey ?? null);
  const daysLeft = $derived(target ? Math.max(0, daysBetween(todayKey(), target)) : 0);
  const hasWork = $derived(!!queue && queue.newLessons.length + queue.reviews.length > 0);

  let dismissedWelcome = $state(false);
  const showWelcome = $derived(planned && !dismissedWelcome && needsCatchup());

  const PRESETS: { id: PresetId; label: string; blurb: string }[] = [
    { id: 'relaxed', label: 'Relaxed', blurb: 'Gentle — about 10 min/day' },
    { id: 'steady', label: 'Steady', blurb: 'Balanced — about 20 min/day' },
    { id: 'intense', label: 'Intense', blurb: 'Fast — about 35 min/day' },
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
  let dateInput = $state('');
  let warn = $state<{ message: string; suggested: string | null } | null>(null);

  async function choosePreset(id: PresetId) {
    busy = true;
    await setPlan({ kind: 'preset', presetId: id });
    busy = false;
  }
  function tryCustom() {
    const r = checkCustomDate(dateInput);
    if (!r) return;
    if (r.ok) {
      void commitDate(dateInput);
    } else {
      warn = {
        message: `That date needs about ${r.requiredBudget} min/day.`,
        suggested: r.suggestedDayKey ?? null,
      };
    }
  }
  async function commitDate(d: string) {
    busy = true;
    await setCustomDate(d);
    busy = false;
    warn = null;
  }
</script>

{#if showWelcome}
  <WelcomeBack onDismiss={() => (dismissedWelcome = true)} />
{/if}

<header>
  <p class="greeting">Guten Tag 👋</p>
  <h1>Today</h1>
</header>

{#if !planned}
  <section class="card">
    <p class="eyebrow">Choose your pace</p>
    <p class="muted">Pick an intensity, or a finish date — we'll build a daily plan and an A1 date. Change it anytime.</p>
    <div class="presets">
      {#each PRESETS as p (p.id)}
        <button class="preset" disabled={busy} onclick={() => choosePreset(p.id)}>
          <span class="preset-label">{p.label}</span>
          <span class="preset-blurb">{p.blurb}</span>
        </button>
      {/each}
    </div>
    <div class="custom">
      <label class="date-label">
        Or pick a finish date
        <input type="date" bind:value={dateInput} min={todayKey()} />
      </label>
      <button class="set" disabled={!dateInput || busy} onclick={tryCustom}>Set date</button>
    </div>
    {#if warn}
      <p class="warn">
        {warn.message}
        {#if warn.suggested}
          Earliest comfortable date is <strong>{warn.suggested}</strong>.
          <button class="link" onclick={() => commitDate(warn!.suggested!)}>Use it</button>
        {/if}
        <button class="link" onclick={() => commitDate(dateInput)}>Set anyway</button>
      </p>
    {/if}
  </section>
{:else}
  <section class="card countdown">
    <p class="eyebrow">Your A1 date</p>
    <p class="big">{target} · {daysLeft} days left</p>
    {#if pace}<span class="pill {pace.kind}">● {PACE_LABEL[pace.kind]}</span>{/if}
  </section>

  <section class="card cta">
    <p class="eyebrow">Today's session</p>
    {#if queue}
      <p class="counts">🆕 {queue.newLessons.length} lessons · 🔁 {queue.reviews.length} reviews · ~{Math.round(queue.estMin)} min</p>
    {/if}
    <button class="primary" disabled={!hasWork} onclick={() => navigate('/session')}>
      {hasWork ? 'Start session' : 'Done for today 🎉'}
    </button>
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
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .big {
    margin: 0 0 var(--s-2);
    font: var(--t-h2);
  }
  .muted {
    margin: 0;
  }
  .counts {
    margin: 0 0 var(--s-2);
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
    text-align: left;
    gap: 2px;
    padding: var(--s-4);
    min-height: var(--tap-min);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--surface-2);
    color: var(--text);
  }
  .preset-label {
    font: var(--t-h2);
  }
  .preset-blurb {
    color: var(--text-muted);
    font: var(--t-small);
  }
  .custom {
    display: flex;
    align-items: flex-end;
    gap: var(--s-3);
    margin-top: var(--s-4);
    flex-wrap: wrap;
  }
  .date-label {
    display: flex;
    flex-direction: column;
    gap: var(--s-1);
    font: var(--t-small);
    color: var(--text-muted);
  }
  .date-label input {
    padding: var(--s-2) var(--s-3);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--surface);
    color: var(--text);
    font: var(--t-body);
  }
  .set {
    min-height: var(--tap-min);
    padding: 0 var(--s-4);
    border: 1px solid var(--border);
    border-radius: var(--r-pill);
    background: var(--accent-weak);
    color: var(--accent);
  }
  .warn {
    margin: var(--s-3) 0 0;
    color: var(--warn);
    font: var(--t-small);
  }
  .link {
    border: none;
    background: none;
    color: var(--accent);
    text-decoration: underline;
    padding: 0 var(--s-1);
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
</style>
