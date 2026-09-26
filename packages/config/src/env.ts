import { z } from 'zod';

/**
 * Variables d'environnement du serveur, validées au démarrage.
 *
 * Règle de sécurité : une erreur nomme la variable et la nature du problème, jamais sa valeur.
 * Une variable présente mais vide (`CLE=`) compte comme absente : c'est ainsi que le fichier de
 * secrets marque ce qui reste à fournir.
 */
const blankToUndefined = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value);

const optional = <T extends z.ZodType>(schema: T) => z.preprocess(blankToUndefined, schema.optional());
const withDefault = <T extends z.ZodType>(schema: T, fallback: z.input<T>) =>
  z.preprocess(blankToUndefined, schema.default(fallback as never));

const SMTP_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'] as const;
const S3_KEYS = [
  'MEDIA_BUCKET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_ENDPOINT_URL_S3',
  'AWS_REGION',
] as const;

const postgresUrl = z.string().regex(/^postgres(ql)?:\/\//u);

export const serverEnvSchema = z
  .object({
    APP_ENV: withDefault(z.enum(['development', 'test', 'production']), 'development'),
    APP_BASE_URL: withDefault(z.url(), 'http://localhost:3000'),
    APP_VERSION: withDefault(z.string().min(1), '0.1.0'),
    LOG_LEVEL: withDefault(z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']), 'info'),
    /** Connexion poolée (hôte `-pooler`) : trafic de l'application. */
    DATABASE_URL: optional(postgresUrl),
    /** Secret de signature des sessions (32 caractères au moins) ; obligatoire en production. */
    BETTER_AUTH_SECRET: optional(z.string().min(32)),
    /** Connexion directe : migrations uniquement. */
    DATABASE_MIGRATION_URL: optional(postgresUrl),
    /** Courriel transactionnel (SMTP) : tout ou rien. Sans lui, pas de courriel hors développement. */
    SMTP_HOST: optional(z.string().min(1)),
    SMTP_PORT: optional(z.coerce.number().int().min(1).max(65535)),
    SMTP_USER: optional(z.string().min(1)),
    SMTP_PASSWORD: optional(z.string().min(1)),
    SMTP_FROM: optional(z.email()),
    /** Médias : Neon Object Storage (compatible S3), tout ou rien ; noms standard AWS injectés par Neon. */
    MEDIA_BUCKET: optional(z.string().min(3).max(63)),
    AWS_ACCESS_KEY_ID: optional(z.string().min(1)),
    AWS_SECRET_ACCESS_KEY: optional(z.string().min(1)),
    AWS_ENDPOINT_URL_S3: optional(z.url()),
    AWS_REGION: optional(z.string().min(1)),
    /** Sans stockage objet : dossier local des médias (développement, tests). */
    MEDIA_DIR: optional(z.string().min(1)),
    /** Tests de parcours uniquement : dossier où les courriels sont écrits au lieu d'être envoyés. */
    MAIL_OUTBOX_DIR: optional(z.string().min(1)),
  })
  .superRefine((env, context) => {
    if (env.APP_ENV === 'production' && !env.DATABASE_URL) {
      context.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'obligatoire en production' });
    }
    if (env.APP_ENV === 'production' && !env.BETTER_AUTH_SECRET) {
      context.addIssue({ code: 'custom', path: ['BETTER_AUTH_SECRET'], message: 'obligatoire en production' });
    }
    const smtp = SMTP_KEYS.filter((key) => env[key] !== undefined);
    if (smtp.length > 0 && smtp.length < SMTP_KEYS.length) {
      for (const key of SMTP_KEYS.filter((candidate) => env[candidate] === undefined)) {
        context.addIssue({ code: 'custom', path: [key], message: 'manquante (les variables SMTP vont ensemble)' });
      }
    }
    const s3 = S3_KEYS.filter((key) => env[key] !== undefined);
    if (s3.length > 0 && s3.length < S3_KEYS.length) {
      for (const key of S3_KEYS.filter((candidate) => env[candidate] === undefined)) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: 'manquante (les variables du stockage objet vont ensemble)',
        });
      }
    }
    if (env.APP_ENV === 'production' && env.MAIL_OUTBOX_DIR) {
      context.addIssue({ code: 'custom', path: ['MAIL_OUTBOX_DIR'], message: 'interdite en production' });
    }
  });

/** Stockage objet des médias complet, ou `undefined` (dossier local). */
export function s3ConfigOf(env: ServerEnv) {
  if (
    !env.MEDIA_BUCKET ||
    !env.AWS_ACCESS_KEY_ID ||
    !env.AWS_SECRET_ACCESS_KEY ||
    !env.AWS_ENDPOINT_URL_S3 ||
    !env.AWS_REGION
  ) {
    return undefined;
  }
  return {
    bucket: env.MEDIA_BUCKET,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    endpoint: env.AWS_ENDPOINT_URL_S3,
    region: env.AWS_REGION,
  };
}

/** Réglages SMTP complets, ou `undefined` si le courriel n'est pas configuré. */
export function smtpConfigOf(env: ServerEnv) {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_FROM) return undefined;
  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    from: env.SMTP_FROM,
  };
}

export type ServerEnv = z.output<typeof serverEnvSchema>;

export class EnvError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`Variables d'environnement invalides : ${problems.join(' ; ')}`);
    this.name = 'EnvError';
    this.problems = problems;
  }
}

function describe(issue: z.core.$ZodIssue, source: Record<string, string | undefined>): string {
  const name = String(issue.path[0] ?? '?');
  if (issue.code === 'custom') return `${name} (${issue.message})`;
  const provided = blankToUndefined(source[name]) !== undefined;
  return `${name} (${provided ? 'valeur invalide' : 'manquante'})`;
}

export function loadServerEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) throw new EnvError(result.error.issues.map((issue) => describe(issue, source)));
  return result.data;
}
