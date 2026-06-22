import { defineConfig } from 'vitest/config';

// The engine is a pure library; tests need no DOM and no Vite plugins.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
