<script lang="ts">
  // Placeholder for the guided "Today" session (the carrot). Built out in M5.
</script>

<header>
  <p class="greeting">Guten Tag 👋</p>
  <h1>Today</h1>
</header>

<section class="card countdown">
  <p class="eyebrow">Your A1 date</p>
  <p class="big">Set up your plan to begin</p>
  <p class="muted">Pick an intensity or a finish date and we'll pace you to genuine A1-readiness.</p>
</section>

<section class="card cta">
  <p class="eyebrow">Today's session</p>
  <p class="muted">Your recommended lessons and reviews will appear here.</p>
  <button class="primary" disabled>Start session</button>
</section>

<p class="scaffold-note">Scaffold (M1). The pace engine, SRS, and exercises arrive in later milestones.</p>

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
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .big {
    margin: 0 0 var(--s-2);
    font: var(--t-h2);
    color: var(--text);
  }
  .muted {
    margin: 0;
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
    cursor: not-allowed;
  }
  .scaffold-note {
    font: var(--t-small);
    color: var(--text-muted);
    text-align: center;
    margin-top: var(--s-6);
  }
</style>
