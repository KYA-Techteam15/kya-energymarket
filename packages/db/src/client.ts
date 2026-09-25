import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';

export type Database = NodePgDatabase<typeof schema>;

export interface DatabaseHandle {
  readonly db: Database;
  close(): Promise<void>;
}

/**
 * Connexion de l'application : l'URL poolée de Neon (hôte `-pooler`), un pool `pg` partagé par le
 * processus (serveur Node longue durée sur Coolify). Les migrations n'utilisent PAS ce client.
 */
export function createDatabase(url: string, options: { max?: number } = {}): DatabaseHandle {
  const pool = new pg.Pool({
    connectionString: url,
    max: options.max ?? 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  const db = drizzle({ client: pool, schema, casing: 'snake_case' });
  return { db, close: () => pool.end() };
}
