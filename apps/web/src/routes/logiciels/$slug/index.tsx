import { createFileRoute, notFound } from '@tanstack/react-router';
import { ComposedPage } from '@/features/content/ComposedPage';
import { composedHead, validateComposedSearch } from '@/features/content/route';
import { getComposedPage } from '@/features/content/server';
import { getLocale } from '@/paraglide/runtime.js';

// Présentation d'un logiciel : page composée « presentation » (spec 004).
export const Route = createFileRoute('/logiciels/$slug/')({
  validateSearch: validateComposedSearch,
  loaderDeps: ({ search }) => ({ preview: search.apercu === '1' }),
  loader: async ({ params, deps }) => {
    const page = await getComposedPage({
      data: { productSlug: params.slug, key: 'presentation', locale: getLocale(), preview: deps.preview },
    });
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData, params, matches }) => composedHead(loaderData, `/logiciels/${params.slug}`, matches),
  component: PresentationPage,
});

function PresentationPage() {
  return <ComposedPage page={Route.useLoaderData()} />;
}
