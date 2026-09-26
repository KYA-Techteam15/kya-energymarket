import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/web/src/**/*.test.ts', 'scripts/**/*.test.mjs'],
    environment: 'node',
    testTimeout: 20_000,
    // Chaque fichier d'intégration démarre sa propre base PGlite (migrations comprises).
    hookTimeout: 60_000,
  },
});
