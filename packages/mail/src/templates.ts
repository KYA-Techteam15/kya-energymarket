import { colors } from '@kya-em/ui/tokens';
import type { MailLocale } from './locale.ts';
import type { MailMessage } from './mailer.ts';

/**
 * Modèles des courriels transactionnels, en français et en anglais. Chaque courriel a une version
 * texte (lue par tous les clients) et une version HTML sobre, aux couleurs de la charte KYA : vert
 * du logo sur le bouton avec une encre foncée (le blanc sur ce vert ne passe pas les contrastes).
 */
export type MailTemplate =
  | { readonly kind: 'verify-email'; readonly name: string; readonly url: string }
  | { readonly kind: 'magic-link'; readonly url: string }
  | { readonly kind: 'reset-password'; readonly name: string; readonly url: string }
  | {
      readonly kind: 'invitation';
      readonly organizationName: string;
      readonly inviterName: string;
      readonly url: string;
    }
  | { readonly kind: 'staff-welcome'; readonly name: string; readonly roleLabel: string; readonly url: string }
  | {
      readonly kind: 'license-seat';
      readonly productName: string;
      readonly inviterName: string;
      readonly key: string;
      readonly url: string;
    }
  | {
      /** Licence émise par l'équipe ou dans un lot (spec 005b) : la clé et la marche à suivre. */
      readonly kind: 'license-key';
      readonly productName: string;
      /** « Étudiant · 1 an » */
      readonly offer: string;
      /** « valable 365 jours à partir de la première activation » ou « jusqu'au 14 mars 2027 » */
      readonly validity: string;
      readonly key: string;
      readonly url: string;
    }
  | {
      /** Essai gratuit : rappel avant la fin (spec 006). */
      readonly kind: 'trial-ending';
      readonly productName: string;
      /** Date de fin, déjà formatée dans la langue du courriel. */
      readonly endDate: string;
      readonly url: string;
    }
  | {
      /** Essai gratuit : fin de l'essai (spec 006). */
      readonly kind: 'trial-ended';
      readonly productName: string;
      readonly url: string;
    };

interface Content {
  readonly subject: string;
  readonly heading: string;
  readonly paragraphs: readonly string[];
  readonly action: string;
  readonly note: string;
}

const firstName = (name: string) => name.trim().split(/\s+/u)[0] || name;

const copy: Record<MailLocale, (template: MailTemplate) => Content> = {
  fr: (template) => {
    switch (template.kind) {
      case 'verify-email':
        return {
          subject: 'Confirmez votre adresse — KYA-EnergyMarket',
          heading: `Bonjour ${firstName(template.name)},`,
          paragraphs: ['Merci d’avoir créé votre compte KYA-EnergyMarket. Confirmez votre adresse pour l’activer.'],
          action: 'Confirmer mon adresse',
          note: 'Ce lien est valable 24 heures. Vous n’avez rien demandé ? Ignorez ce courriel.',
        };
      case 'magic-link':
        return {
          subject: 'Votre lien de connexion — KYA-EnergyMarket',
          heading: 'Connexion à KYA-EnergyMarket',
          paragraphs: ['Utilisez ce bouton pour vous connecter, sans mot de passe.'],
          action: 'Me connecter',
          note: 'Ce lien ne sert qu’une fois et reste valable 10 minutes. Vous n’avez rien demandé ? Ignorez ce courriel.',
        };
      case 'reset-password':
        return {
          subject: 'Réinitialiser votre mot de passe — KYA-EnergyMarket',
          heading: `Bonjour ${firstName(template.name)},`,
          paragraphs: ['Une demande de nouveau mot de passe a été faite pour votre compte.'],
          action: 'Choisir un nouveau mot de passe',
          note: 'Ce lien est valable 1 heure. Si vous n’êtes pas à l’origine de la demande, ignorez ce courriel : votre mot de passe ne change pas.',
        };
      case 'invitation':
        return {
          subject: `Invitation à rejoindre ${template.organizationName} — KYA-EnergyMarket`,
          heading: `Rejoignez ${template.organizationName}`,
          paragraphs: [
            `${template.inviterName} vous invite à rejoindre ${template.organizationName} sur KYA-EnergyMarket, pour partager ses licences et ses devis.`,
          ],
          action: 'Voir l’invitation',
          note: 'L’invitation est valable 7 jours. Connectez-vous (ou créez votre compte) avec cette adresse pour l’accepter.',
        };
      case 'license-seat':
        return {
          subject: `Un poste de ${template.productName} pour vous — KYA-EnergyMarket`,
          heading: `Un poste de ${template.productName} pour vous`,
          paragraphs: [
            `${template.inviterName} vous attribue un poste de ${template.productName}.`,
            `Votre clé de licence : ${template.key}`,
            'Installez le logiciel, puis collez cette clé au premier lancement. Un poste correspond à un ordinateur.',
          ],
          action: 'Démarrer',
          note: 'Gardez cette clé pour vous : elle ouvre les postes de votre organisation.',
        };
      case 'license-key':
        return {
          subject: `Votre licence ${template.productName} — KYA-EnergyMarket`,
          heading: `Votre licence ${template.productName}`,
          paragraphs: [
            `Une licence ${template.productName} (${template.offer}) vous est attribuée, ${template.validity}.`,
            `Votre clé de licence : ${template.key}`,
            'Installez le logiciel, puis collez cette clé au premier lancement. Créez votre compte KYA-EnergyMarket avec cette adresse pour retrouver la licence dans votre espace.',
          ],
          action: 'Retrouver ma licence',
          note: 'Gardez cette clé pour vous : elle est personnelle.',
        };
      case 'trial-ending':
        return {
          subject: `Votre essai de ${template.productName} se termine bientôt — KYA-EnergyMarket`,
          heading: `Votre essai se termine le ${template.endDate}`,
          paragraphs: [
            `Votre essai de ${template.productName} se termine le ${template.endDate}.`,
            'Pour continuer sans interruption, choisissez votre licence : vos projets restent à vous et s’ouvrent aussitôt dans l’édition achetée.',
          ],
          action: 'Voir les tarifs',
          note: 'Après la fin de l’essai, le logiciel passe en lecture seule : rien n’est effacé.',
        };
      case 'trial-ended':
        return {
          subject: `Votre essai de ${template.productName} est terminé — KYA-EnergyMarket`,
          heading: 'Votre essai est terminé',
          paragraphs: [
            `Merci d’avoir essayé ${template.productName}. Le logiciel est maintenant en lecture seule : vos projets restent consultables et exportables.`,
            'Choisissez votre licence pour reprendre là où vous en étiez.',
          ],
          action: 'Choisir ma licence',
          note: 'Une question avant d’acheter ? Répondez simplement à ce courriel.',
        };
      case 'staff-welcome':
        return {
          subject: 'Bienvenue dans l’équipe KYA-EnergyMarket',
          heading: `Bienvenue ${firstName(template.name)},`,
          paragraphs: [
            `Un compte vous a été ouvert sur KYA-EnergyMarket avec le rôle ${template.roleLabel}.`,
            'Choisissez votre mot de passe pour accéder à l’administration.',
          ],
          action: 'Choisir mon mot de passe',
          note: 'Ce lien est valable 72 heures. Passé ce délai, utilisez « Mot de passe oublié » sur la page de connexion.',
        };
    }
  },
  en: (template) => {
    switch (template.kind) {
      case 'verify-email':
        return {
          subject: 'Confirm your email — KYA-EnergyMarket',
          heading: `Hello ${firstName(template.name)},`,
          paragraphs: ['Thanks for creating your KYA-EnergyMarket account. Confirm your email address to activate it.'],
          action: 'Confirm my email',
          note: 'This link is valid for 24 hours. Didn’t ask for this? Just ignore this email.',
        };
      case 'magic-link':
        return {
          subject: 'Your sign-in link — KYA-EnergyMarket',
          heading: 'Sign in to KYA-EnergyMarket',
          paragraphs: ['Use this button to sign in, no password needed.'],
          action: 'Sign me in',
          note: 'This link works once and is valid for 10 minutes. Didn’t ask for this? Just ignore this email.',
        };
      case 'reset-password':
        return {
          subject: 'Reset your password — KYA-EnergyMarket',
          heading: `Hello ${firstName(template.name)},`,
          paragraphs: ['Someone asked for a new password for your account.'],
          action: 'Choose a new password',
          note: 'This link is valid for 1 hour. If you didn’t ask for it, ignore this email: your password stays the same.',
        };
      case 'invitation':
        return {
          subject: `Invitation to join ${template.organizationName} — KYA-EnergyMarket`,
          heading: `Join ${template.organizationName}`,
          paragraphs: [
            `${template.inviterName} invites you to join ${template.organizationName} on KYA-EnergyMarket, to share its licences and quotes.`,
          ],
          action: 'View the invitation',
          note: 'The invitation is valid for 7 days. Sign in (or create your account) with this email address to accept it.',
        };
      case 'license-seat':
        return {
          subject: `A ${template.productName} seat for you — KYA-EnergyMarket`,
          heading: `A ${template.productName} seat for you`,
          paragraphs: [
            `${template.inviterName} assigns you a ${template.productName} seat.`,
            `Your licence key: ${template.key}`,
            'Install the software, then paste this key at first launch. One seat is one computer.',
          ],
          action: 'Get started',
          note: 'Keep this key to yourself: it opens your organisation’s seats.',
        };
      case 'license-key':
        return {
          subject: `Your ${template.productName} licence — KYA-EnergyMarket`,
          heading: `Your ${template.productName} licence`,
          paragraphs: [
            `A ${template.productName} licence (${template.offer}) has been assigned to you, ${template.validity}.`,
            `Your licence key: ${template.key}`,
            'Install the software, then paste this key on first launch. Create your KYA-EnergyMarket account with this address to find the licence in your space.',
          ],
          action: 'Find my licence',
          note: 'Keep this key to yourself: it is personal.',
        };
      case 'trial-ending':
        return {
          subject: `Your ${template.productName} trial ends soon — KYA-EnergyMarket`,
          heading: `Your trial ends on ${template.endDate}`,
          paragraphs: [
            `Your ${template.productName} trial ends on ${template.endDate}.`,
            'To carry on without interruption, choose your licence: your projects stay yours and open straight away in the edition you buy.',
          ],
          action: 'See pricing',
          note: 'After the trial, the software switches to read-only: nothing is deleted.',
        };
      case 'trial-ended':
        return {
          subject: `Your ${template.productName} trial has ended — KYA-EnergyMarket`,
          heading: 'Your trial has ended',
          paragraphs: [
            `Thanks for trying ${template.productName}. The software is now read-only: your projects can still be viewed and exported.`,
            'Choose your licence to pick up where you left off.',
          ],
          action: 'Choose my licence',
          note: 'A question before buying? Just reply to this email.',
        };
      case 'staff-welcome':
        return {
          subject: 'Welcome to the KYA-EnergyMarket team',
          heading: `Welcome ${firstName(template.name)},`,
          paragraphs: [
            `An account has been opened for you on KYA-EnergyMarket with the ${template.roleLabel} role.`,
            'Choose your password to access the administration.',
          ],
          action: 'Choose my password',
          note: 'This link is valid for 72 hours. After that, use “Forgot password” on the sign-in page.',
        };
    }
  },
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/gu, (character) => `&#${character.charCodeAt(0)};`);

const footer: Record<MailLocale, string> = {
  fr: 'KYA-EnergyMarket · la marketplace des logiciels de KYA-Energy Group',
  en: 'KYA-EnergyMarket · the software marketplace of KYA-Energy Group',
};

const fallbackLink: Record<MailLocale, string> = {
  fr: 'Le bouton ne marche pas ? Copiez cette adresse dans votre navigateur :',
  en: 'Button not working? Copy this address into your browser:',
};

function html(content: Content, url: string, locale: MailLocale): string {
  const font = "Inter, 'Segoe UI', Helvetica, Arial, sans-serif";
  const paragraphs = content.paragraphs
    .map((text) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6">${escapeHtml(text)}</p>`)
    .join('');
  const href = escapeHtml(url);
  return `<!doctype html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(content.subject)}</title></head>
<body style="margin:0;padding:0;background:${colors.soft};color:${colors.ink};font-family:${font}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.soft}">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${colors.white};border:1px solid ${colors.line};border-radius:16px">
<tr><td style="padding:28px 32px 0;font-family:Poppins,${font};font-weight:700;font-size:18px;letter-spacing:-0.01em">
<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${colors.green};margin-right:8px"></span>KYA-EnergyMarket</td></tr>
<tr><td style="padding:28px 32px 8px">
<h1 style="margin:0 0 16px;font-family:Poppins,${font};font-size:24px;line-height:1.25;letter-spacing:-0.02em">${escapeHtml(content.heading)}</h1>
${paragraphs}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="border-radius:999px;background:${colors.green}">
<a href="${href}" style="display:inline-block;padding:14px 26px;font-weight:600;font-size:16px;color:${colors.onGreen};text-decoration:none">${escapeHtml(content.action)}</a>
</td></tr></table>
<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${colors.muted}">${escapeHtml(content.note)}</p>
<p style="margin:0 0 28px;font-size:13px;line-height:1.5;color:${colors.muted}">${escapeHtml(fallbackLink[locale])}<br><a href="${href}" style="color:${colors.greenDeep};word-break:break-all">${href}</a></p>
</td></tr>
<tr><td style="padding:18px 32px;border-top:1px solid ${colors.line};font-size:12px;color:${colors.muted}">${escapeHtml(footer[locale])}</td></tr>
</table></td></tr></table>
</body></html>`;
}

function text(content: Content, url: string, locale: MailLocale): string {
  return [
    content.heading,
    '',
    ...content.paragraphs,
    '',
    `${content.action} : ${url}`,
    '',
    content.note,
    '',
    '—',
    footer[locale],
  ].join('\n');
}

/** Rend un courriel prêt à envoyer. */
export function renderMail(template: MailTemplate, locale: MailLocale, to: string): MailMessage {
  const content = copy[locale](template);
  return {
    to,
    kind: template.kind,
    subject: content.subject,
    text: text(content, template.url, locale),
    html: html(content, template.url, locale),
  };
}
