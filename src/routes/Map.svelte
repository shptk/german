<script lang="ts">
  // Placeholder for the free-roam module map (the always-visible "finish line").
  // Real serpentine map + always-unlocked nodes land in M5.
  const modules = [
    'Erste Schritte',
    'Ich & du',
    'Familie & Freunde',
    'Essen & Trinken',
    'Einkaufen',
    'Wohnen',
    'Tagesablauf & Zeit',
    'Freizeit & Hobbys',
    'Unterwegs',
    'Arbeit, Gesundheit & Alltag',
  ];
</script>

<header>
  <h1>Map</h1>
  <p>All of A1, always unlocked. The journey ends at the mock exam 🏁</p>
</header>

<ol class="path" aria-label="A1 modules">
  {#each modules as name, i (name)}
    <li class="node">
      <span class="dot" aria-hidden="true">{i + 1}</span>
      <span class="name">{name}</span>
    </li>
  {/each}
  <li class="node finish">
    <span class="dot" aria-hidden="true">🏁</span>
    <span class="name">Start Deutsch 1 — mock exam</span>
  </li>
</ol>

<style>
  .path {
    list-style: none;
    margin: var(--s-4) 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }
  .node {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: var(--s-3) var(--s-4);
    min-height: var(--tap-min);
  }
  .dot {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    flex: none;
    border-radius: var(--r-pill);
    background: var(--surface-2);
    color: var(--text-muted);
    font: var(--t-small);
  }
  .finish {
    border-color: var(--accent);
    background: var(--accent-weak);
  }
  .name {
    color: var(--text);
  }
</style>
