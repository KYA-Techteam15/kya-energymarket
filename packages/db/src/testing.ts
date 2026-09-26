import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { Database } from './client.ts';
import * as schema from './schema.ts';

/**
 * Base de test : Postgres embarqué (PGlite), en mémoire, avec les mêmes migrations que Neon.
 * Aucune connexion réseau, aucun secret.
 */
export async function createTestDatabase(): Promise<{ db: Database; close(): Promise<void> }> {
  const client = new PGlite();
  const db = drizzle({ client, schema, casing: 'snake_case' });
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
  return { db: db as unknown as Database, close: () => client.close() };
}
