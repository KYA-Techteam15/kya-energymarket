import { createFileRoute, redirect } from '@tanstack/react-router';
import { CatalogAdminPage } from '@/features/admin/CatalogAdminPage';
import { getCatalogAdmin } from '@/features/admin/content';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/admin/catalogue/')({
  loader: async () => {
    const admin = await getCatalogAdmin();
    if (!admin) throw redirect({ to: '/admin' });
    return admin;
  },
  head: () => ({ meta: [{ title: `${m.admin_catalog()} — KYA-EnergyMarket` }] }),
  component: CatalogAdminRoute,
});

function CatalogAdminRoute() {
  return <CatalogAdminPage admin={Route.useLoaderData()} />;
}
