<script lang="ts">
  import { useRegisterSW } from 'virtual:pwa-register/svelte';

  // registerType:'prompt' — we register the SW here and surface an opt-in update,
  // so a new version never reloads the app out from under a live session.
  const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
    immediate: true,
  });

  function close() {
    needRefresh.set(false);
    offlineReady.set(false);
  }
</script>

{#if $offlineReady || $needRefresh}
  <div class="toast" role="status" aria-live="polite">
    <span class="msg">
      {#if $needRefresh}
        A new version is ready.
      {:else}
        Ready to work offline.
      {/if}
    </span>
    {#if $needRefresh}
      <button class="action" onclick={() => updateServiceWorker(true)}>Update</button>
    {/if}
    <button class="dismiss" onclick={close} aria-label="Dismiss">✕</button>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(var(--tabbar-h) + var(--safe-b) + var(--s-3));
    z-index: 20;
    display: flex;
    align-items: center;
    gap: var(--s-3);
    max-width: calc(var(--content-max) - var(--s-5));
    width: max-content;
    padding: var(--s-3) var(--s-4);
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: var(--r-pill);
    box-shadow: var(--shadow-2);
    font: var(--t-small);
  }

  .action {
    border: none;
    background: var(--accent);
    color: var(--on-accent);
    padding: var(--s-2) var(--s-4);
    border-radius: var(--r-pill);
    font: var(--t-small);
  }

  .dismiss {
    border: none;
    background: transparent;
    color: var(--text-muted);
    padding: var(--s-1);
    line-height: 1;
  }
</style>
