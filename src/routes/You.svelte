<script lang="ts">
  import type { PresetId } from '$engine/index';
  import {
    app,
    checkCustomDate,
    cloudAvailable,
    connectCloud,
    disconnectCloud,
    exportBackup,
    importBackup,
    pausePlan,
    resetProgress,
    resumePlan,
    setCustomDate,
    setPlan,
    syncNow,
    todayKey,
    updateSettings,
  } from '$lib/stores/store.svelte';
  import { germanVoices, speak } from '$lib/audio/tts';

  const streak = $derived(app.state?.streak.current ?? 0);
  const lessonsDone = $derived(app.state?.progress.totals.lessonsDone ?? 0);
  const vocabSeen = $derived(app.state?.progress.totals.vocabSeen ?? 0);
  const paused = $derived(!!app.state?.plan?.pausedAt);
  const rate = $derived(app.state?.settings.ttsRate ?? 0.9);
  const voiceURI = $derived(app.state?.settings.ttsVoiceURI ?? '');
  const theme = $derived(app.state?.settings.theme ?? 'system');
  const voices = germanVoices();

  const canCloud = cloudAvailable();
  const syncStatus = $derived(app.syncStatus);
  const cloudEmail = $derived(app.cloudEmail);
  const SYNC_LABEL: Record<string, string> = {
    'local-only': 'Not signed in', idle: 'Synced', syncing: 'Syncing…',
    offline: 'Offline — will sync later', paused: 'Tap Sync now to update',
    conflict: 'Needs attention', error: 'Sync error',
  };

  let message = $state('');
  let dateInput = $state('');
  let warn = $state<{ message: string; suggested: string | null } | null>(null);
  let resetStep = $state(0);

  async function doExport() {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'german-a1-backup.json'; a.click();
    URL.revokeObjectURL(url); message = 'Backup downloaded.';
  }
  async function onImport(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0]; if (!file) return;
    try {
      const res = await importBackup(JSON.parse(await file.text()), 'merge');
      message = res.warnings.length ? `Imported with notes: ${res.warnings[0]}` : 'Backup imported.';
    } catch { message = "That file isn't a valid German A1 backup."; }
    input.value = '';
  }
  function onRate(e: Event) { void updateSettings({ ttsRate: Number((e.currentTarget as HTMLInputElement).value) }); }
  function onVoice(e: Event) { void updateSettings({ ttsVoiceURI: (e.currentTarget as HTMLSelectElement).value || null }); }
  function onTheme(e: Event) { void updateSettings({ theme: (e.currentTarget as HTMLSelectElement).value as 'system' | 'light' | 'dark' }); }

  function tryReschedule() {
    const r = checkCustomDate(dateInput);
    if (!r) return;
    if (r.ok) void applyDate(dateInput);
    else warn = { message: `That date needs about ${r.requiredBudget} min/day.`, suggested: r.suggestedDayKey ?? null };
  }
  async function applyDate(d: string) {
    await setCustomDate(d); warn = null; dateInput = ''; message = 'Your A1 date is updated.';
  }

  async function doReset() {
    await resetProgress(); resetStep = 0; message = 'All progress was reset.';
  }
</script>

<header>
  <h1>You</h1>
  <p>Your progress is saved on this device{cloudEmail ? ' and synced to Google Drive' : ''}.</p>
</header>

<dl class="rows">
  <div class="row"><dt>Streak</dt><dd>🔥 {streak}</dd></div>
  <div class="row"><dt>Lessons done</dt><dd>{lessonsDone}</dd></div>
  <div class="row"><dt>Words seen</dt><dd>{vocabSeen}</dd></div>
</dl>

{#if app.state?.plan}
  <section class="card">
    <p class="eyebrow">Plan</p>
    <p class="muted">A1 date: {app.state.plan.targetDayKey} · ~{app.state.plan.dailyTimeBudgetMin} min/day</p>
    <div class="actions">
      {#if paused}<button class="btn" onclick={resumePlan}>Resume</button>
      {:else}<button class="btn ghost" onclick={pausePlan}>Pause (sick day)</button>{/if}
    </div>

    <p class="eyebrow sub">Change intensity</p>
    <div class="actions">
      {#each ['relaxed', 'steady', 'intense'] as const as id (id)}
        <button class="btn ghost sm" onclick={() => setPlan({ kind: 'preset', presetId: id as PresetId })}>{id}</button>
      {/each}
    </div>

    <p class="eyebrow sub">Or set a finish date</p>
    <div class="custom">
      <input type="date" bind:value={dateInput} min={todayKey()} />
      <button class="btn ghost sm" disabled={!dateInput} onclick={tryReschedule}>Apply</button>
    </div>
    {#if warn}
      <p class="warn">
        {warn.message}
        {#if warn.suggested}Earliest comfortable: <strong>{warn.suggested}</strong>
          <button class="link" onclick={() => applyDate(warn!.suggested!)}>use it</button>{/if}
        <button class="link" onclick={() => applyDate(dateInput)}>set anyway</button>
      </p>
    {/if}
  </section>
{/if}

<section class="card">
  <p class="eyebrow">Appearance</p>
  <label class="field">
    Theme
    <select value={theme} onchange={onTheme}>
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
</section>

<section class="card">
  <p class="eyebrow">Audio</p>
  <label class="field">Speed: {rate.toFixed(2)}×
    <input type="range" min="0.6" max="1.1" step="0.05" value={rate} oninput={onRate} />
  </label>
  {#if voices.length}
    <label class="field">German voice
      <select value={voiceURI} onchange={onVoice}>
        <option value="">Default</option>
        {#each voices as v (v.voiceURI)}<option value={v.voiceURI}>{v.name}</option>{/each}
      </select>
    </label>
    <button class="btn ghost sm" onclick={() => speak('Guten Tag! Wie geht es dir?', { rate, voiceURI: voiceURI || null })}>Test voice</button>
  {:else}<p class="muted">No German voice found on this device.</p>{/if}
</section>

{#if canCloud}
  <section class="card">
    <p class="eyebrow">Sync</p>
    {#if cloudEmail}
      <p class="muted">Signed in as {cloudEmail} · {SYNC_LABEL[syncStatus.kind] ?? syncStatus.kind}</p>
      <div class="actions">
        <button class="btn" onclick={syncNow}>Sync now</button>
        <button class="btn ghost" onclick={disconnectCloud}>Sign out</button>
      </div>
    {:else}
      <p class="muted">Sign in to sync your progress across devices, stored in a single file in your own Google Drive (the app only ever touches that one file).</p>
      <div class="actions"><button class="btn" onclick={connectCloud}>Sign in with Google</button></div>
    {/if}
  </section>
{/if}

<section class="card">
  <p class="eyebrow">Backup</p>
  <p class="muted">Save your progress or restore it manually.</p>
  <div class="actions">
    <button class="btn" onclick={doExport}>Export</button>
    <label class="btn ghost">Import<input type="file" accept="application/json" onchange={onImport} hidden /></label>
  </div>
  {#if message}<p class="msg" role="status" aria-live="polite">{message}</p>{/if}
</section>

<section class="card danger">
  <p class="eyebrow">Reset</p>
  {#if resetStep === 0}
    <p class="muted">Erase all your progress and start over.</p>
    <button class="btn warn-btn" onclick={() => (resetStep = 1)}>Reset all progress</button>
  {:else}
    <p class="muted">This erases all your progress on this device{cloudEmail ? ' and your synced Google Drive copy' : ''} and cannot be undone.</p>
    <div class="actions">
      <button class="btn warn-btn" onclick={doReset}>Delete everything</button>
      <button class="btn ghost" onclick={() => (resetStep = 0)}>Cancel</button>
    </div>
  {/if}
</section>

<style>
  .rows { margin: var(--s-4) 0; display: flex; flex-direction: column; gap: var(--s-2); }
  .row { display: flex; justify-content: space-between; align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); padding: var(--s-3) var(--s-4); min-height: var(--tap-min); }
  dt { font-weight: 600; }
  dd { margin: 0; color: var(--accent); font-weight: 600; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: var(--s-5); box-shadow: var(--shadow-1); margin-bottom: var(--s-4); }
  .card.danger { border-color: color-mix(in srgb, var(--warn) 45%, var(--border)); }
  .eyebrow { margin: 0 0 var(--s-2); color: var(--text-muted); font: var(--t-small); font-family: var(--font-mono); letter-spacing: 0.02em; text-transform: uppercase; }
  .eyebrow.sub { margin-top: var(--s-4); }
  .muted { margin: 0 0 var(--s-3); color: var(--text-muted); }
  .actions { display: flex; gap: var(--s-3); flex-wrap: wrap; }
  .custom { display: flex; gap: var(--s-3); align-items: center; flex-wrap: wrap; }
  .custom input { padding: var(--s-2) var(--s-3); border: 1px solid var(--border); border-radius: var(--r-md); background: var(--surface); color: var(--text); font: var(--t-body); }
  .field { display: flex; flex-direction: column; gap: var(--s-2); margin-bottom: var(--s-4); font: var(--t-small); color: var(--text-muted); }
  .field:last-child { margin-bottom: 0; }
  .field input[type='range'] { width: 100%; }
  .field select { padding: var(--s-2) var(--s-3); border: 1px solid var(--border); border-radius: var(--r-md); background: var(--surface); color: var(--text); font: var(--t-body); }
  .btn { display: inline-flex; align-items: center; min-height: var(--tap-min); padding: 0 var(--s-4); border-radius: var(--r-pill); border: none; background: var(--accent); color: var(--on-accent); font: var(--t-small); cursor: pointer; }
  .btn.ghost { background: var(--accent-weak); color: var(--accent); }
  .btn.sm { min-height: 36px; text-transform: capitalize; }
  .btn.warn-btn { background: var(--warn); color: #fff; }
  .warn { margin: var(--s-3) 0 0; color: var(--warn); font: var(--t-small); }
  .link { border: none; background: none; color: var(--accent); text-decoration: underline; padding: 0 var(--s-1); cursor: pointer; }
  .msg { margin: var(--s-3) 0 0; font: var(--t-small); color: var(--text-muted); }
</style>
