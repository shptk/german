<script lang="ts">
  import { route, segment } from '$lib/router/router.svelte';

  const tabs = [
    { id: 'today', href: '#/today', label: 'Today', icon: '◎' },
    { id: 'map', href: '#/map', label: 'Map', icon: '⛳' },
    { id: 'you', href: '#/you', label: 'You', icon: '☻' },
  ];

  const active = $derived(segment(route.path));
</script>

<nav class="tabbar" aria-label="Primary">
  {#each tabs as tab (tab.id)}
    <a
      class="tab"
      class:active={active === tab.id}
      href={tab.href}
      aria-current={active === tab.id ? 'page' : undefined}
    >
      <span class="icon" aria-hidden="true">{tab.icon}</span>
      <span class="label">{tab.label}</span>
    </a>
  {/each}
</nav>

<style>
  .tabbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 10;
    display: flex;
    justify-content: space-around;
    align-items: stretch;
    height: calc(var(--tabbar-h) + var(--safe-b));
    padding-bottom: var(--safe-b);
    max-width: var(--content-max);
    margin-inline: auto;
    background: color-mix(in srgb, var(--surface) 92%, transparent);
    backdrop-filter: blur(12px);
    border-top: 1px solid var(--border);
  }

  .tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-height: var(--tap-min);
    color: var(--text-muted);
    font: var(--t-small);
    transition: color var(--dur-fast) var(--ease);
  }

  .tab.active {
    color: var(--accent);
  }

  .icon {
    font-size: 1.25rem;
    line-height: 1;
  }
</style>
