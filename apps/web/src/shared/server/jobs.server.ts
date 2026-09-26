import type { DatabaseHandle } from '@kya-em/db';
import { daysLabel, getLicense, pick, runDueJobs, type JobHandlers, type Logger } from '@kya-em/domain';
import { renderMail, type Mailer } from '@kya-em/mail';

/**
 * Exécution de la file de travaux (spec 005b, FR-007) dans le processus du serveur : toutes les 5 s,
 * les travaux dus sont réservés en base (plusieurs processus ne prennent jamais le même).
 */
interface WorkerContext {
  readonly database: DatabaseHandle;
  readonly mailer: Mailer | null;
  readonly secret: string;
  readonly baseUrl: string;
  readonly logger: Logger;
}

const INTERVAL_MS = 5_000;

export function jobHandlers(context: WorkerContext): JobHandlers {
  return {
    /** Courriel de clé d'une licence émise ou d'un lot. */
    'mail.license_key': async (payload) => {
      if (!context.mailer) throw new Error('aucun envoi de courriel configuré');
      const email = String(payload.email ?? '');
      const locale = payload.locale === 'en' ? 'en' : 'fr';
      const license = await getLicense({ db: context.database.db, secret: context.secret }, String(payload.licenseId));
      if (!license || license.status === 'revoked') return;
      if (!license.key) throw new Error('clé indéchiffrable');
      const date = new Intl.DateTimeFormat(locale, { dateStyle: 'long' });
      const validity = license.expiresAt
        ? locale === 'en'
          ? `valid until ${date.format(Date.parse(license.expiresAt))}`
          : `valable jusqu’au ${date.format(Date.parse(license.expiresAt))}`
        : locale === 'en'
          ? `valid for ${daysLabel(license.days, 'en')} from first activation`
          : `valable ${daysLabel(license.days, 'fr')} à partir de la première activation`;
      await context.mailer.send(
        renderMail(
          {
            kind: 'license-key',
            productName: license.productName,
            offer: `${pick(license.editionName, locale)} · ${pick(license.typeName, locale)}`,
            validity,
            key: license.key,
            url: `${context.baseUrl}/${locale}/espace/licences`,
          },
          locale,
          email,
        ),
      );
    },
  };
}

let timer: ReturnType<typeof setInterval> | undefined;

export function startJobWorker(context: WorkerContext) {
  if (timer) return;
  const handlers = jobHandlers(context);
  let running = false;
  timer = setInterval(() => {
    if (running) return;
    running = true;
    runDueJobs(context.database.db, handlers, context.logger)
      .catch((error: unknown) => context.logger.error({ err: error }, 'file de travaux indisponible'))
      .finally(() => {
        running = false;
      });
  }, INTERVAL_MS);
  timer.unref?.();
}
