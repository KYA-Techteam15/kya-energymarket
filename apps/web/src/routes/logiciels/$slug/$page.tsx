import { createFileRoute, notFound } from '@tanstack/react-router';
import { ComposedPage } from '@/features/content/ComposedPage';
import { composedHead, validateComposedSearch } from '@/features/content/route';
import { getComposedPage } from '@/features/content/server';
import { getLocale } from '@/paraglide/runtime.js';

// Onglets et pages d'un logiciel : tarifs, ressources, support, guide… (spec 004).
export const Route = createFileRoute('/logiciels/$slug/$page')({
  validateSearch: validateComposedSearch,
  loaderDeps: ({ search }) => ({ preview: search.apercu === '1' }),
  loader: async ({ params, deps }) => {
    if (params.page === 'presentation') throw notFound();
    const page = await getComposedPage({
      data: { productSlug: params.slug, key: params.page, locale: getLocale(), preview: deps.preview },
    }).catch(() => null);
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData, params, matches }) =>
    composedHead(loaderData, `/logiciels/${params.slug}/${params.page}`, matches),
  component: ProductPage,
});

function ProductPage() {
  const search = Route.useSearch();
  return <ComposedPage page={Route.useLoaderData()} edition={search.edition} />;
}
