import { createFileRoute, redirect } from '@tanstack/react-router';
import { getProductAdmin } from '@/features/admin/content';
import { ProductAdminPage } from '@/features/admin/ProductAdminPage';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/admin/catalogue/$slug')({
  loader: async ({ params }) => {
    const admin = await getProductAdmin({ data: { slug: params.slug } });
    if (!admin) throw redirect({ to: '/admin/catalogue' });
    return admin;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.product.name ?? m.admin_catalog()} — KYA-EnergyMarket` }],
  }),
  component: ProductAdminRoute,
});

function ProductAdminRoute() {
  const admin = Route.useLoaderData();
  // Les formulaires gardent les valeurs saisies, qui sont celles enregistrées ; une nouvelle édition
  // ou durée apparaît au rechargement des données.
  return <ProductAdminPage key={admin.product.slug} admin={admin} />;
}
