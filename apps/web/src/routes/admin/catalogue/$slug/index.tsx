import { createFileRoute, redirect } from '@tanstack/react-router';
import { getEditing } from '@/features/admin/catalog/catalog';
import { ProductPage } from '@/features/admin/catalog/ProductPage';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/admin/catalogue/$slug/')({
  loader: async ({ params }) => {
    const editing = await getEditing({ data: { slug: params.slug } });
    if (!editing) throw redirect({ to: '/admin/catalogue' });
    return editing;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.document.product.name ?? m.cx_nav_catalog()} — ${m.cx_brand()} KYA-EnergyMarket` }],
  }),
  component: ProductRoute,
});

function ProductRoute() {
  const { slug } = Route.useParams();
  return <ProductPage slug={slug} editing={Route.useLoaderData()} />;
}
