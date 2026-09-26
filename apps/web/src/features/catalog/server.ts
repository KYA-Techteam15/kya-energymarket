import { createServerFn } from '@tanstack/react-start';
import { loadCatalogSummary } from './catalog.server';

const localeInput = (input: unknown) => {
  const { locale } = (input ?? {}) as { locale?: unknown };
  return { locale: locale === 'en' ? ('en' as const) : ('fr' as const) };
};

export const getCatalogSummary = createServerFn({ method: 'GET' })
  .validator(localeInput)
  .handler(({ data }) => loadCatalogSummary(data.locale));

export type CatalogSummary = Awaited<ReturnType<typeof loadCatalogSummary>>;

/** Logiciel disponible (page et onglets) ; `null` pour un logiciel inconnu, masqué ou « bientôt ». */
export const getProductSummary = createServerFn({ method: 'GET' })
  .validator((input: unknown) => {
    const { slug, locale } = (input ?? {}) as { slug?: unknown; locale?: unknown };
    if (typeof slug !== 'string' || !/^[a-z0-9-]{1,60}$/u.test(slug)) throw new Error('logiciel inconnu');
    return { slug, ...localeInput({ locale }) };
  })
  .handler(async ({ data }) => {
    const summary = await loadCatalogSummary(data.locale);
    return summary.find((product) => product.slug === data.slug && product.status === 'available') ?? null;
  });
