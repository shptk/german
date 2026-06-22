<script lang="ts">
  import type { PresetId } from '$engine/index';
  import {
    app,
    cloudAvailable,
    connectCloud,
    disconnectCloud,
    exportBackup,
    importBackup,
    pausePlan,
    resumePlan,
    setPlan,
    syncNow,
    updateSettings,
  } from '$lib/stores/store.svelte';
  import { germanVoices, speak } from '$lib/audio/tts';

  const streak = $derived(app.state?.streak.current ?? 0);
  const lessonsDone = $derived(app.state?.progress.totals.lessonsDone ?? 0);
  const vocabSeen = $derived(app.state?.progress.totals.vocabSeen ?? 0);
  const paused = $derived(!!app.state?.plan?.pausedAt);
  const rate = $derived(app.state?.settings.ttsRate ?? 0.9);
  const voiceURI = $derived(app.state?.settings.ttsVoiceURI ?? '');
  const voices = germanVoices();

  let message = $state('');

  async function doExport() {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'german-a1-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    message = 'Backup downloaded.';
  }
  async function onImport(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const res = await importBackup(json, 'merge');
      message = res.warnings.length ? `Imported with notes: ${res.warnings[0]}` : 'Backup imported.';
    } catch {
      message = "That file isn't a valid German A1 backup.";
    }
    input.value = '';
  }
  function onRate(e: Event) {
    void updateSettings({ ttsRate: Number((e.currentTarget as HTMLInputElement).value) });
  }
  function onVoice(e: Event) {
    void updateSettings({ ttsVoiceURI: (e.currentTarget as HTMLSelectElement).value || null });
  }

  const canCloud = cloudAvailable();
  const syncStatus = $derived(app.syncStatus);
  const SYNC_LABEL: Record<string, string> = {
    'local-only': 'On this device',
    idle: 'Synced to your Google Drive',
    syncing: 'Syncing…',
    offline: 'Offline — will sync when back online',
    conflict: 'Needs attention',
    error: 'Sync error',
  };
  const connected = $derived(syncStatus.kind !== 'local-only');
</script>

<header>
  <h1>You</h1>
  <p>Your progress is saved on this device.</p>
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
      {#if paused}
        <button class="btn" onclick={resumePlan}>Resume</button>
      {:else}
        <button class="btn ghost" onclick={pausePlan}>Pause (sick day)</button>
      {/if}
    </div>
    <p class="eyebrow sub">Change pace</p>
    <div class="actions">
      {#each ['relaxed', 'steady', 'intense'] as const as id (id)}
        <button class="btn ghost sm" onclick={() => setPlan({ kind: 'preset', presetId: id as PresetId })}>{id}</button>
      {/each}
    </div>
  </section>
{/if}

<section class="card">
  <p class="eyebrow">Audio</p>
  <label class="field">
    Speed: {rate.toFixed(2)}×
    <input type="range" min="0.6" max="1.1" step="0.05" value={rate} oninput={onRate} />
  </label>
  {#if voices.length}
    <label class="field">
      German voice
      <select value={voiceURI} onchange={onVoice}>
        <option value="">Default</option>
        {#each voices as v (v.voiceURI)}<option value={v.voiceURI}>{v.name}</option>{/each}
      </select>
    </label>
    <button class="btn ghost sm" onclick={() => speak('Guten Tag! Wie geht es dir?', { rate, voiceURI: voiceURI || null })}>
      Test voice
    </button>
  {:else}
    <p class="muted">No German voice found on this device.</p>
  {/if}
</section>

<section class="card">
  <p class="eyebrow">Sync</p>
  {#if canCloud}
    <p class="muted">Status: {SYNC_LABEL[syncStatus.kind] ?? syncStatus.kind}</p>
    <div class="actions">
      {#if connected}
        <button class="btn" onclick={syncNow}>Sync now</button>
        <button class="btn ghost" onclick={disconnectCloud}>Disconnect</button>
      {:else}
        <button class="btn" onclick={connectCloud}>Sign in with Google</button>
      {/if}
    </div>
    <p class="msg">
      Syncs your progress to a hidden folder in your own Google Drive. On first sign-in Google may show
      an “unverified app” screen — that's expected for this minimal hidden-folder access; choose Advanced → continue.
    </p>
  {:else}
    <p class="muted">Saved on this device. Cross-device sync via Google can be turned on in a build configured with a Google client id.</p>
  {/if}
</section>

<section class="card">
  <p class="eyebrow">Backup</p>
  <p class="muted">Save your progress or restore it. (Cross-device sync via Google arrives later.)</p>
  <div class="actions">
    <button class="btn" onclick={doExport}>Export</button>
    <label class="btn ghost">
      Import
      <input type="file" accept="application/json" onchange={onImport} hidden />
    </label>
  </div>
  {#if message}<p class="msg" role="status" aria-live="polite">{message}</p>{/if}
</section>

<style>
  .rows {
    margin: var(--s-4) 0;
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: var(--s-3) var(--s-4);
    min-height: var(--tap-min);
  }
  dt {
    font-weight: 600;
  }
  dd {
    margin: 0;
    color: var(--accent);
    font-weight: 600;
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
  }
  .eyebrow.sub {
    margin-top: var(--s-4);
  }
  .muted {
    margin: 0 0 var(--s-3);
    color: var(--text-muted);
  }
  .actions {
    display: flex;
    gap: var(--s-3);
    flex-wrap: wrap;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    margin-bottom: var(--s-4);
    font: var(--t-small);
    color: var(--text-muted);
  }
  .field input[type='range'] {
    width: 100%;
  }
  .field select {
    padding: var(--s-2) var(--s-3);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--surface);
    color: var(--text);
  }
  .btn {
    display: inline-flex;
    align-items: center;
    min-height: var(--tap-min);
    padding: 0 var(--s-4);
    border-radius: var(--r-pill);
    border: none;
    background: var(--accent);
    color: var(--on-accent);
    font: var(--t-small);
    cursor: pointer;
  }
  .btn.ghost {
    background: var(--accent-weak);
    color: var(--accent);
  }
  .btn.sm {
    min-height: 36px;
    text-transform: capitalize;
  }
  .msg {
    margin: var(--s-3) 0 0;
    font: var(--t-small);
    color: var(--text-muted);
  }
</style>
