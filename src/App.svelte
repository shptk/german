<script lang="ts">
  import { route, segment } from '$lib/router/router.svelte';
  import Tabbar from '$lib/components/ui/Tabbar.svelte';
  import UpdateToast from '$lib/components/ui/UpdateToast.svelte';
  import Today from './routes/Today.svelte';
  import MapView from './routes/Map.svelte';
  import You from './routes/You.svelte';
  import NotFound from './routes/NotFound.svelte';

  // Route table (the only place routes are mapped). Capitalized so it renders as a component.
  const Current = $derived.by(() => {
    switch (segment(route.path)) {
      case 'today':
        return Today;
      case 'map':
        return MapView;
      case 'you':
        return You;
      default:
        return NotFound;
    }
  });
</script>

<div class="app-frame">
  <main class="app-main">
    {#key route.path}
      <Current />
    {/key}
  </main>
  <Tabbar />
</div>

<UpdateToast />
