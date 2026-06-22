<script lang="ts">
  import { app, updateSettings } from '$lib/stores/store.svelte';

  // Track the OS preference so a 'system' setting resolves to the right glyph and
  // live-updates if the user flips their OS theme while on 'system'.
  let systemDark = $state(
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  $effect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => (systemDark = e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  });

  const stored = $derived(app.state?.settings.theme ?? 'system');
  const isDark = $derived(stored === 'dark' || (stored === 'system' && systemDark));

  // Quick switch flips to an explicit light/dark; the full Light/Dark/System
  // dropdown in You → Appearance still owns the 'system' (follow-OS) choice.
  function toggle() {
    void updateSettings({ theme: isDark ? 'light' : 'dark' });
  }
</script>

<div class="anchor">
  <button
    class="theme-toggle"
    type="button"
    onclick={toggle}
    aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
  >
    <span class="icon" aria-hidden="true">{isDark ? '☀' : '☾'}</span>
  </button>
</div>

<style>
  /* Pin to the right edge of the centered content column (mirrors the tabbar's
     max-width + margin-inline:auto trick) so it lines up with content on wide screens. */
  .anchor {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 20;
    max-width: var(--content-max);
    margin-inline: auto;
    padding: calc(var(--safe-t) + var(--s-3)) var(--s-4) 0;
    display: flex;
    justify-content: flex-end;
    pointer-events: none;
  }

  .theme-toggle {
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--r-pill);
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--surface) 92%, transparent);
    backdrop-filter: blur(12px);
    color: var(--text-muted);
    cursor: pointer;
    transition:
      color var(--dur-fast) var(--ease),
      border-color var(--dur-fast) var(--ease);
  }

  .theme-toggle:hover {
    color: var(--accent);
    border-color: var(--accent-dim);
  }

  .icon {
    font-size: 1.15rem;
    line-height: 1;
  }
</style>
