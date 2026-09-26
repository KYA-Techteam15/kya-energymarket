import type { Logger } from '@kya-em/domain';
import nodemailer from 'nodemailer';
import type { Mailer } from './mailer.ts';

export interface SmtpConfig {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly password: string;
  /** Adresse d'expédition ; le nom affiché est ajouté ici. */
  readonly from: string;
  readonly fromName?: string;
}

/**
 * Adaptateur SMTP. Port 465 : TLS dès la connexion ; autres ports : STARTTLS exigé. Le mot de passe
 * n'est jamais journalisé ; en cas d'échec, le journal donne le code d'erreur et le destinataire.
 */
export function createSmtpMailer(config: SmtpConfig, logger?: Logger): Mailer {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port !== 465,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  const from = { name: config.fromName ?? 'KYA-EnergyMarket', address: config.from };

  return {
    async send(message) {
      try {
        await transport.sendMail({
          from,
          to: message.to,
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
        });
        logger?.info({ to: message.to, kind: message.kind }, 'courriel envoyé');
      } catch (error) {
        const code = (error as { code?: string }).code ?? 'UNKNOWN';
        logger?.error({ to: message.to, kind: message.kind, code }, 'courriel non envoyé');
        throw new Error(`Envoi du courriel impossible (${code}).`, { cause: error });
      }
    },
  };
}
