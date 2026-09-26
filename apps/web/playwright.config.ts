import { existsSync, readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
import { OUTBOX_DIR } from './e2e/outbox';

const PORT = 4173;

// En local, la base des parcours est la branche Neon « test » (DATABASE_TEST_* de .env.local).
// En CI, E2E_DATABASE_URL pointe vers le conteneur Postgres du workflow.
const envFile = new URL('../../.env.local', import.meta.url);
if (!process.env.E2E_DATABASE_URL && existsSync(envFile)) {
  const local = Object.fromEntries(
    readFileSync(envFile, 'utf8')
      .split(/\r?\n/u)
      .filter((line) => /^DATABASE_TEST_(MIGRATION_)?URL=/u.test(line))
      .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim()]),
  );
  if (local.DATABASE_TEST_URL) process.env.E2E_DATABASE_URL = local.DATABASE_TEST_URL;
  if (local.DATABASE_TEST_MIGRATION_URL) process.env.E2E_DATABASE_MIGRATION_URL = local.DATABASE_TEST_MIGRATION_URL;
}

// Les parcours tournent sur la version construite (pnpm build), comme en production.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // En local, la base des parcours est une branche Neon distante : pas plus de trois parcours à la fois.
  workers: process.env.CI ? 2 : 3,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 60_000,
  // Les parcours de comptes appellent la base à chaque étape : navigations plus longues qu'une page statique.
  expect: { timeout: 15_000 },
  // Public francophone d'abord ; les tests de langue règlent leur propre navigateur.
  use: { baseURL: `http://localhost:${PORT}`, locale: 'fr-FR', trace: 'retain-on-failure' },
  projects: [
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node e2e/start-server.mjs',
    port: PORT,
    reuseExistingServer: !process.env.CI,
    // Courriels écrits dans la boîte d'envoi des tests : les parcours suivent les liens reçus.
    env: {
      PORT: String(PORT),
      APP_BASE_URL: `http://localhost:${PORT}`,
      LOG_LEVEL: 'warn',
      MAIL_OUTBOX_DIR: OUTBOX_DIR,
    },
    timeout: 120_000,
  },
});
