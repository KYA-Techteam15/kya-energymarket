import type { Logger } from '@kya-em/domain';

/**
 * Port d'envoi de courriels (spec 002, FR-012). Le fournisseur n'est pas encore choisi : sans lui,
 * `mailer` vaut `null`, le lien de connexion est masqué et les invitations se partagent par lien.
 */
export interface MailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/** Développement seulement : le courriel s'écrit dans le journal local, jamais envoyé. */
export function createDevelopmentMailer(logger: Logger): Mailer {
  return {
    async send(message) {
      logger.info(
        { to: message.to, subject: message.subject, body: message.text },
        'courriel (développement, non envoyé)',
      );
    },
  };
}
