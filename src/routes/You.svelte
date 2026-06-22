<script lang="ts">
  import { app, exportBackup, importBackup } from '$lib/stores/store.svelte';

  const streak = $derived(app.state?.streak.current ?? 0);
  const lessonsDone = $derived(app.state?.progress.totals.lessonsDone ?? 0);
  const vocabSeen = $derived(app.state?.progress.totals.vocabSeen ?? 0);

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

<section class="card">
  <p class="eyebrow">Backup</p>
  <p class="muted">Save a copy of your progress, or restore it on another device. (Cross-device sync via Google arrives later.)</p>
  <div class="actions">
    <button class="btn" onclick={doExport}>Export backup</button>
    <label class="btn ghost">
      Import backup
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
  }
  .eyebrow {
    margin: 0 0 var(--s-2);
    color: var(--text-muted);
    font: var(--t-small);
    text-transform: uppercase;
  }
  .muted {
    margin: 0 0 var(--s-4);
  }
  .actions {
    display: flex;
    gap: var(--s-3);
    flex-wrap: wrap;
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
  .msg {
    margin: var(--s-3) 0 0;
    font: var(--t-small);
    color: var(--text-muted);
  }
</style>
