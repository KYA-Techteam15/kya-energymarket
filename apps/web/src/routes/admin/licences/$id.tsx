import { createFileRoute, redirect } from '@tanstack/react-router';
import { getLicenseAdmin } from '@/features/admin/licenses';
import { LicenseAdminPage } from '@/features/admin/LicenseAdminPage';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/admin/licences/$id')({
  loader: async ({ params }) => {
    const admin = await getLicenseAdmin({ data: { id: params.id } });
    if (!admin) throw redirect({ to: '/admin/licences' });
    return admin;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.license.customerName ?? m.admin_licenses()} — KYA-EnergyMarket` }],
  }),
  component: LicenseAdminRoute,
});

function LicenseAdminRoute() {
  return <LicenseAdminPage admin={Route.useLoaderData()} />;
}
