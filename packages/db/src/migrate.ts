// Applique les migrations par la connexion DIRECTE de Neon (sans `-pooler`), comme le recommande
// Neon : le pooler en mode transaction ne convient pas aux migrations.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const envFile = new URL('../../../.env.local', import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

const url = process.env.DATABASE_MIGRATION_URL?.trim();
if (!url) {
  console.error('DATABASE_MIGRATION_URL manquante : lancez `pnpm neon:setup` puis `pnpm env:link`.');
  process.exit(1);
}
if (new URL(url.replace(/^postgres(ql)?:/u, 'http:')).hostname.includes('-pooler')) {
  console.error('DATABASE_MIGRATION_URL doit être la connexion directe (hôte sans « -pooler »).');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await migrate(drizzle({ client }), { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
  console.log('Migrations appliquées.');
} finally {
  await client.end();
}
