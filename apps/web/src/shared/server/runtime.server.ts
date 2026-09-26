import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAuth, type Auth } from '@kya-em/auth';
import { loadServerEnv, smtpConfigOf, type ServerEnv } from '@kya-em/config';
import { createDatabase, type DatabaseHandle } from '@kya-em/db';
import { createLogger, type Logger } from '@kya-em/domain';
import { createLogMailer, createOutboxMailer, createSmtpMailer, type Mailer } from '@kya-em/mail';

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
  /** `null` : aucun courriel (lien de connexion masqué, invitations par lien, adresse non vérifiée). */
  readonly mailer: Mailer | null;
  /** Un courriel peut-il partir ? (lien de connexion, invitations par courriel, vérification) */
  readonly mailerConfigured: boolean;
}

// Secret de développement et de test uniquement ; la production exige BETTER_AUTH_SECRET.
const LOCAL_ONLY_SECRET = 'kya-em-secret-local-uniquement-jamais-en-production';

let current: Runtime | undefined;

/**
 * Courriel : boîte d'envoi fichier pour les tests de parcours, SMTP s'il est configuré, sinon journal
 * local en développement ; ailleurs, aucun.
 */
function chooseMailer(env: ServerEnv, logger: Logger): Mailer | null {
  if (env.MAIL_OUTBOX_DIR && env.APP_ENV !== 'production') return createOutboxMailer(env.MAIL_OUTBOX_DIR);
  const smtp = smtpConfigOf(env);
  if (smtp) return createSmtpMailer(smtp, logger);
  return env.APP_ENV === 'development' ? createLogMailer(logger) : null;
}

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
    const mailer = chooseMailer(env, logger);
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
      {
        environment: env.APP_ENV,
        version: env.APP_VERSION,
        database: database ? 'configured' : 'not_configured',
        mail: env.MAIL_OUTBOX_DIR ? 'outbox' : smtpConfigOf(env) ? 'smtp' : mailer ? 'log' : 'none',
      },
      'démarrage',
    );
    current = { env, logger, database, auth, mailer, mailerConfigured: mailer !== null };
  }
  return current;
}
