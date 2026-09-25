import { locales, localizeHref } from '@/paraglide/runtime.js';

const BASE_URL = (import.meta.env.VITE_APP_BASE_URL as string | undefined) ?? 'http://localhost:3000';

/** Adresse canonique et versions linguistiques d'une page (spec 001, FR-009). */
export function localizedLinks(pathname: string, currentLocale: string) {
  const absolute = (locale: string) => new URL(localizeHref(pathname, { locale: locale as never }), BASE_URL).href;
  return [
    { rel: 'canonical', href: absolute(currentLocale) },
    ...locales.map((locale) => ({ rel: 'alternate', hrefLang: locale, href: absolute(locale) })),
    { rel: 'alternate', hrefLang: 'x-default', href: new URL('/', BASE_URL).href },
  ];
}
