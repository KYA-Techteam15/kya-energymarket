/**
 * État de l'application pour `GET /api/health` (contrat : specs/001-socle/contracts/health.md).
 * Ne renvoie jamais d'adresse de base ni de secret.
 */
export type HealthProbe = () => Promise<void>;

export interface HealthReport {
  readonly status: 'ok' | 'degraded';
  readonly version: string;
  readonly environment: string;
  readonly checks: { readonly database: 'ok' | 'unavailable' | 'not_configured' };
  readonly time: string;
}

function withTimeout(probe: HealthProbe, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('délai dépassé')), timeoutMs);
    probe().then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

export async function checkHealth(options: {
  readonly version: string;
  readonly environment: string;
  /** `undefined` : aucune base configurée (accepté en développement). */
  readonly database: HealthProbe | undefined;
  readonly timeoutMs?: number;
  readonly now?: () => Date;
}): Promise<HealthReport> {
  let database: HealthReport['checks']['database'] = 'not_configured';
  if (options.database) {
    try {
      await withTimeout(options.database, options.timeoutMs ?? 3000);
      database = 'ok';
    } catch {
      database = 'unavailable';
    }
  }
  return {
    status: database === 'unavailable' ? 'degraded' : 'ok',
    version: options.version,
    environment: options.environment,
    checks: { database },
    time: (options.now?.() ?? new Date()).toISOString(),
  };
}
