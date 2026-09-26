export type MailLocale = 'fr' | 'en';

/**
 * Langue d'un courriel déclenché par une requête : cookie de langue du site (KYA_LOCALE), sinon la
 * langue préférée du navigateur, sinon le français (public francophone d'abord).
 */
export function localeFromRequest(request?: Request | null): MailLocale {
  if (!request) return 'fr';
  const cookie = request.headers.get('cookie') ?? '';
  const fromCookie = /(?:^|;\s*)KYA_LOCALE=(fr|en)\b/u.exec(cookie)?.[1];
  if (fromCookie === 'fr' || fromCookie === 'en') return fromCookie;
  const preferred = (request.headers.get('accept-language') ?? '').split(',')[0]?.trim().toLowerCase() ?? '';
  return preferred.startsWith('en') ? 'en' : 'fr';
}
