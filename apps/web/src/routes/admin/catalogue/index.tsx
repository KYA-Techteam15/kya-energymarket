import { createFileRoute, redirect } from '@tanstack/react-router';
import { getProducts } from '@/features/admin/catalog/catalog';
import { CatalogPage } from '@/features/admin/catalog/CatalogPage';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/admin/catalogue/')({
  loader: async () => {
    const data = await getProducts();
    if (!data) throw redirect({ to: '/admin' });
    return data;
  },
  head: () => ({ meta: [{ title: `${m.cx_nav_products()} — ${m.cx_brand()} KYA-EnergyMarket` }] }),
  component: CatalogRoute,
});

function CatalogRoute() {
  return <CatalogPage data={Route.useLoaderData()} />;
}
