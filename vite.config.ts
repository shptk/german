import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // Repo `german` → project site serves at <umbrella>/german/ (e.g. pathak.uk/german/);
  // the Cloudflare Worker at learn.pathak.uk channels /german to it (path-preserved).
  // base must match the /german/ public path so assets/SW/manifest URLs resolve.
  base: '/german/',

  resolve: {
    alias: {
      $lib: r('./src/lib'),
      $engine: r('./src/lib/engine'),
      $content: r('./src/lib/content'),
      $persist: r('./src/lib/persistence'),
    },
  },

  plugins: [
    svelte(),
    VitePWA({
      // 'prompt' => never yank content/app mid-session; user taps to update (see UpdateToast.svelte).
      registerType: 'prompt',
      // SW registration is owned by the UpdateToast component via virtual:pwa-register/svelte.
      injectRegister: false,

      // Icons + apple-touch + favicon are generated from public/logo.svg and injected into the manifest.
      pwaAssets: {
        image: 'public/logo.svg',
        overrideManifestIcons: true,
      },

      manifest: {
        name: 'German A1 Challenge',
        short_name: 'German A1',
        description: 'Beat all of German A1 as a finite, time-boxed challenge.',
        lang: 'en',
        start_url: '/german/#/today',
        scope: '/german/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FBFBFD',
        theme_color: '#2f9e44',
        categories: ['education'],
      },

      workbox: {
        // Precache the app shell AND all content JSON so the whole course works
        // offline after install. cleanupOutdatedCaches removes prior precache
        // versions on activate (no stale-cache bloat).
        globPatterns: ['**/*.{js,css,html,svg,woff2,png,ico,json}'],
        navigateFallback: '/german/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
      },

      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: '/german/index.html',
      },
    }),
  ],
});
