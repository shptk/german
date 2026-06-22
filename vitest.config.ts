import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// The engine is a pure library; tests need no DOM and no Vite plugins.
export default defineConfig({
  resolve: {
    alias: {
      $lib: r('./src/lib'),
      $engine: r('./src/lib/engine'),
      $content: r('./src/lib/content'),
      $persist: r('./src/lib/persistence'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
