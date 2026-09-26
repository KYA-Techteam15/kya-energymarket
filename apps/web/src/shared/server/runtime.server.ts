import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAuth, createDevelopmentMailer, type Auth } from '@kya-em/auth';
import { loadServerEnv, type ServerEnv } from '@kya-em/config';
import { createDatabase, type DatabaseHandle } from '@kya-em/db';
import { createLogger, type Logger } from '@kya-em/domain';

/**
 * Ressources du serveur, créées une fois par processus : variables validées, journal, pool de base,
 * authentification. En développement seulement, `.env.local` (racine du dépôt) est lu s'il existe ;
 * il ne remplace jamais une variable déjà définie. Les tests (`APP_ENV=test`) et la production ne
 * lisent jamais les secrets du poste.
 */
export interface Runtime {
  readonly env: ServerEnv;
  readonly logger: Logger;
  readonly database: DatabaseHandle | undefined;
  /** `undefined` sans base : les pages de compte l'annoncent au lieu d'échouer. */
  readonly auth: Auth | undefined;
  /** Un fournisseur de courriel est-il branché ? (lien de connexion, invitations par courriel) */
  readonly mailerConfigured: boolean;
}

// Secret de développement et de test uniquement ; la production exige BETTER_AUTH_SECRET.
const LOCAL_ONLY_SECRET = 'kya-em-secret-local-uniquement-jamais-en-production';

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
    // Aucun fournisseur de courriel choisi pour l'instant : journal local en développement seulement.
    const mailer = env.APP_ENV === 'development' ? createDevelopmentMailer(logger) : null;
    const auth = database
      ? createAuth({
          db: database.db,
          secret: env.BETTER_AUTH_SECRET ?? LOCAL_ONLY_SECRET,
          baseUrl: env.APP_BASE_URL,
          environment: env.APP_ENV,
          mailer,
          logger,
        })
      : undefined;
    logger.info(
      { environment: env.APP_ENV, version: env.APP_VERSION, database: database ? 'configured' : 'not_configured' },
      'démarrage',
    );
    current = { env, logger, database, auth, mailerConfigured: mailer !== null };
  }
  return current;
}
