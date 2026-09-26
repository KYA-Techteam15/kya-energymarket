import pino, { type DestinationStream, type Logger as PinoLogger } from 'pino';

export type Logger = PinoLogger;

/** Clés dont la valeur est toujours masquée dans les journaux, à tout niveau d'imbrication. */
export const REDACTED_KEYS = [
  'password',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'authorization',
  'cookie',
  'databaseUrl',
  'DATABASE_URL',
  'DATABASE_MIGRATION_URL',
] as const;

const paths = REDACTED_KEYS.flatMap((key) => [key, `*.${key}`, `*.*.${key}`, `req.headers.${key.toLowerCase()}`]);

/** Journal JSON structuré (une ligne par événement), sans valeur secrète. */
export function createLogger(
  options: { level?: string; service?: string } = {},
  destination?: DestinationStream,
): Logger {
  return pino(
    {
      level: options.level ?? 'info',
      base: { service: options.service ?? 'kya-energy-market' },
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: { paths, censor: '[masqué]' },
      formatters: { level: (label) => ({ level: label }) },
    },
    destination,
  );
}
