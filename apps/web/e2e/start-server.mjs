// Serveur des tests de parcours : applique les migrations sur la base de test, puis démarre la
// version construite. Base : E2E_DATABASE_URL (CI : conteneur Postgres ; local : branche Neon « test »).
// Sans base, le serveur démarre quand même et les parcours de comptes sont ignorés.
import { spawn, spawnSync } from 'node:child_process';

const databaseUrl = process.env.E2E_DATABASE_URL;
if (databaseUrl) {
  const migration = spawnSync('pnpm', ['--filter', '@kya-em/db', 'migrate'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, DATABASE_MIGRATION_URL: process.env.E2E_DATABASE_MIGRATION_URL ?? databaseUrl },
  });
  if (migration.status !== 0) process.exit(migration.status ?? 1);
}

const server = spawn('node', ['.output/server/index.mjs'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    APP_ENV: 'test',
    ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
    BETTER_AUTH_SECRET: 'secret-des-tests-de-parcours-uniquement-0123456789',
  },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 0));
