import { createFileRoute, redirect } from '@tanstack/react-router';
import { getEditing } from '@/features/admin/catalog/catalog';
import { EditionPage, type EditionTab } from '@/features/admin/catalog/EditionPage';
import { m } from '@/paraglide/messages.js';

interface EditionSearch {
  readonly onglet?: EditionTab;
  readonly type?: string;
}

export const Route = createFileRoute('/admin/catalogue/$slug/$edition')({
  validateSearch: (search: Record<string, unknown>): EditionSearch => ({
    onglet: search.onglet === 'caracteristiques' || search.onglet === 'types' ? search.onglet : undefined,
    type: typeof search.type === 'string' && /^([0-9a-f-]{36}|nouveau)$/u.test(search.type) ? search.type : undefined,
  }),
  loader: async ({ params }) => {
    const editing = await getEditing({ data: { slug: params.slug } });
    if (!editing) throw redirect({ to: '/admin/catalogue' });
    if (!editing.document.editions.some((edition) => edition.code === params.edition)) {
      throw redirect({ to: '/admin/catalogue/$slug', params: { slug: params.slug } });
    }
    return editing;
  },
  head: ({ loaderData, params }) => ({
    meta: [
      {
        title: `${loaderData?.document.editions.find((edition) => edition.code === params.edition)?.name.fr ?? m.cx_edition()} — ${m.cx_brand()} KYA-EnergyMarket`,
      },
    ],
  }),
  component: EditionRoute,
});

function EditionRoute() {
  const { slug, edition } = Route.useParams();
  const search = Route.useSearch();
  return (
    <EditionPage
      slug={slug}
      code={edition}
      editing={Route.useLoaderData()}
      tab={search.type ? 'types' : (search.onglet ?? 'droits')}
      typeId={search.type}
    />
  );
}
