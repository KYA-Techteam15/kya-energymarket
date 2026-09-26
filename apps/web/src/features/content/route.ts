import { baseUrlFrom, localizedLinks } from '@/features/i18n/seo';
import { getLocale } from '@/paraglide/runtime.js';

/** Paramètres d'adresse des pages composées : aperçu de l'équipe, édition demandée (tarifs). */
export interface ComposedSearch {
  readonly apercu?: '1';
  readonly edition?: string;
}

export const validateComposedSearch = (search: Record<string, unknown>): ComposedSearch => ({
  apercu: search.apercu === '1' ? '1' : undefined,
  edition: typeof search.edition === 'string' && /^[a-z_]{1,30}$/u.test(search.edition) ? search.edition : undefined,
});

/** Balises d'une page composée : titre, description, versions linguistiques ; brouillon jamais indexé. */
export function composedHead(
  page: { title: string; description: string; preview: boolean } | undefined,
  pathname: string,
  matches: ReadonlyArray<{ loaderData?: unknown }>,
  suffix = 'KYA-EnergyMarket',
) {
  if (!page) return {};
  return {
    meta: [
      { title: page.title === suffix ? page.title : `${page.title} — ${suffix}` },
      { name: 'description', content: page.description },
      ...(page.preview ? [{ name: 'robots', content: 'noindex' }] : []),
    ],
    links: localizedLinks(pathname, getLocale(), baseUrlFrom(matches)),
  };
}
