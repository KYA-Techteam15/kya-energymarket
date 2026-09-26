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

const postgresUrl = z.string().regex(/^postgres(ql)?:\/\//u);

export const serverEnvSchema = z
  .object({
    APP_ENV: withDefault(z.enum(['development', 'test', 'production']), 'development'),
    APP_BASE_URL: withDefault(z.url(), 'http://localhost:3000'),
    APP_VERSION: withDefault(z.string().min(1), '0.1.0'),
    LOG_LEVEL: withDefault(z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']), 'info'),
    /** Connexion poolée (hôte `-pooler`) : trafic de l'application. */
    DATABASE_URL: optional(postgresUrl),
    /** Connexion directe : migrations uniquement. */
    DATABASE_MIGRATION_URL: optional(postgresUrl),
  })
  .superRefine((env, context) => {
    if (env.APP_ENV === 'production' && !env.DATABASE_URL) {
      context.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'obligatoire en production' });
    }
  });

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
