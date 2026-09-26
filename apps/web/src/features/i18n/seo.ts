import { createServerFn } from '@tanstack/react-start';
import { locales, localizeHref } from '@/paraglide/runtime.js';

const FALLBACK_BASE_URL = 'http://localhost:3000';

/**
 * Configuration publique lue à l'exécution (et non à la construction) : la même image sert en test et
 * en production. Chargée une fois par la route racine, rendue au navigateur avec la page : serveur et
 * navigateur produisent ainsi exactement les mêmes balises.
 */
export const getPublicConfig = createServerFn({ method: 'GET' }).handler(() => ({
  baseUrl: process.env.APP_BASE_URL?.trim() || FALLBACK_BASE_URL,
}));

type PublicConfig = Awaited<ReturnType<typeof getPublicConfig>>;

/** Adresse publique, tirée des données de la route racine (première correspondance). */
export function baseUrlFrom(matches: ReadonlyArray<{ loaderData?: unknown }>): string {
  return (matches[0]?.loaderData as PublicConfig | undefined)?.baseUrl ?? FALLBACK_BASE_URL;
}

/** Adresse canonique et versions linguistiques d'une page (spec 001, FR-009). */
export function localizedLinks(pathname: string, currentLocale: string, baseUrl: string) {
  const absolute = (locale: string) => new URL(localizeHref(pathname, { locale: locale as never }), baseUrl).href;
  return [
    { rel: 'canonical', href: absolute(currentLocale) },
    ...locales.map((locale) => ({ rel: 'alternate', hrefLang: locale, href: absolute(locale) })),
    { rel: 'alternate', hrefLang: 'x-default', href: new URL('/', baseUrl).href },
  ];
}
