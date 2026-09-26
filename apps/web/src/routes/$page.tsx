import { createFileRoute, notFound } from '@tanstack/react-router';
import { ComposedPage } from '@/features/content/ComposedPage';
import { composedHead, validateComposedSearch } from '@/features/content/route';
import { getComposedPage } from '@/features/content/server';
import { getLocale } from '@/paraglide/runtime.js';

// Pages de la marketplace composées dans l'administration : aide, à propos, contact, légal… (spec 004).
export const Route = createFileRoute('/$page')({
  validateSearch: validateComposedSearch,
  loaderDeps: ({ search }) => ({ preview: search.apercu === '1' }),
  loader: async ({ params, deps }) => {
    const page = await getComposedPage({
      data: { productSlug: null, key: params.page, locale: getLocale(), preview: deps.preview },
    }).catch(() => null);
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData, params, matches }) => composedHead(loaderData, `/${params.page}`, matches),
  component: MarketPage,
});

function MarketPage() {
  return <ComposedPage page={Route.useLoaderData()} />;
}
