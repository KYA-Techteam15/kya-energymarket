import { PAGE_KEY } from '@kya-em/domain';
import { createServerFn } from '@tanstack/react-start';
import { loadComposedPage } from './page.server';

const pageInput = (input: unknown) => {
  const { productSlug, key, locale, preview } = (input ?? {}) as Record<string, unknown>;
  if (typeof key !== 'string' || !PAGE_KEY.test(key)) throw new Error('page inconnue');
  if (productSlug !== null && (typeof productSlug !== 'string' || !PAGE_KEY.test(productSlug))) {
    throw new Error('logiciel inconnu');
  }
  return {
    ref: { productSlug: productSlug as string | null, key },
    locale: locale === 'en' ? ('en' as const) : ('fr' as const),
    preview: preview === true,
  };
};

export const getComposedPage = createServerFn({ method: 'GET' })
  .validator(pageInput)
  .handler(({ data }) => loadComposedPage(data));
