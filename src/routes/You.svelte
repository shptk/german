<script lang="ts">
  // Placeholder for stats / settings / backup / (later) Google sign-in. Built out in M5/M8.
  const rows = [
    { label: 'Streak', value: '—', hint: 'Daily streak (never wiped by a miss)' },
    { label: 'Pace', value: '—', hint: 'Ahead / on-track / behind your A1 date' },
    { label: 'Backup', value: 'Local only', hint: 'Export / import lives here; Drive sync arrives later' },
    { label: 'Audio', value: 'System voice', hint: 'German pronunciation via your device' },
  ];
</script>

<header>
  <h1>You</h1>
  <p>Your progress is saved on this device.</p>
</header>

<dl class="rows">
  {#each rows as row (row.label)}
    <div class="row">
      <dt>{row.label}</dt>
      <dd class="value">{row.value}</dd>
      <dd class="hint">{row.hint}</dd>
    </div>
  {/each}
</dl>

<style>
  .rows {
    margin: var(--s-4) 0 0;
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }
  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas: 'label value' 'hint hint';
    gap: var(--s-1) var(--s-3);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: var(--s-3) var(--s-4);
  }
  dt {
    grid-area: label;
    color: var(--text);
    font-weight: 600;
  }
  .value {
    grid-area: value;
    margin: 0;
    color: var(--accent);
    font-weight: 600;
  }
  .hint {
    grid-area: hint;
    margin: 0;
    color: var(--text-muted);
    font: var(--t-small);
  }
</style>
