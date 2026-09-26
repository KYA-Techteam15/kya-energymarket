import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadServerEnv, type ServerEnv } from '@kya-em/config';
import { createDatabase, type DatabaseHandle } from '@kya-em/db';
import { createLogger, type Logger } from '@kya-em/domain';

/**
 * Ressources du serveur, créées une fois par processus : variables validées, journal, pool de base.
 * En développement seulement, `.env.local` (racine du dépôt) est lu s'il existe ; il ne remplace jamais
 * une variable déjà définie. Les tests (`APP_ENV=test`) et la production ne lisent jamais les secrets du poste.
 */
export interface Runtime {
  readonly env: ServerEnv;
  readonly logger: Logger;
  readonly database: DatabaseHandle | undefined;
}

let current: Runtime | undefined;

function loadLocalEnvFile() {
  const environment = process.env.APP_ENV ?? 'development';
  if (environment !== 'development') return;
  for (const candidate of [resolve(process.cwd(), '.env.local'), resolve(process.cwd(), '../../.env.local')]) {
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return;
    }
  }
}

export function runtime(): Runtime {
  if (!current) {
    loadLocalEnvFile();
    const env = loadServerEnv();
    const logger = createLogger({ level: env.LOG_LEVEL });
    const database = env.DATABASE_URL ? createDatabase(env.DATABASE_URL) : undefined;
    logger.info(
      { environment: env.APP_ENV, version: env.APP_VERSION, database: database ? 'configured' : 'not_configured' },
      'démarrage',
    );
    current = { env, logger, database };
  }
  return current;
}
