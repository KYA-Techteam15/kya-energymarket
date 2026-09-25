import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

// Les parcours tournent sur la version construite (pnpm build), comme en production.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  // Public francophone d'abord ; les tests de langue règlent leur propre navigateur.
  use: { baseURL: `http://localhost:${PORT}`, locale: 'fr-FR', trace: 'retain-on-failure' },
  projects: [
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node .output/server/index.mjs',
    port: PORT,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT), APP_ENV: 'test', LOG_LEVEL: 'warn' },
    timeout: 60_000,
  },
});
