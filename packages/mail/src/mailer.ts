import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Logger } from '@kya-em/domain';

/**
 * Port d'envoi de courriels. Les modules métier ne connaissent que ce contrat ; l'adaptateur (SMTP,
 * journal, boîte d'envoi des tests) est choisi au démarrage du serveur.
 */
export interface MailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
  /** Nature du courriel (`verify-email`, `magic-link`…) : journal et tests, jamais montrée. */
  readonly kind?: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/** Développement sans SMTP : le courriel s'écrit dans le journal local, jamais envoyé. */
export function createLogMailer(logger: Logger): Mailer {
  return {
    async send(message) {
      logger.info(
        { to: message.to, subject: message.subject, kind: message.kind, body: message.text },
        'courriel (développement, non envoyé)',
      );
    },
  };
}

/**
 * Tests de parcours : chaque courriel devient un fichier JSON dans `directory`, que le test relit pour
 * suivre le lien (vérification d'adresse, mot de passe oublié). Jamais utilisé en production.
 */
export function createOutboxMailer(directory: string): Mailer {
  mkdirSync(directory, { recursive: true });
  let sequence = 0;
  return {
    async send(message) {
      sequence += 1;
      const name = `${Date.now()}-${String(sequence).padStart(4, '0')}.json`;
      writeFileSync(join(directory, name), JSON.stringify(message, null, 2));
    },
  };
}

/** Tests unitaires : garde les courriels en mémoire. */
export function createMemoryMailer(): Mailer & { readonly sent: MailMessage[] } {
  const sent: MailMessage[] = [];
  return {
    sent,
    async send(message) {
      sent.push(message);
    },
  };
}
