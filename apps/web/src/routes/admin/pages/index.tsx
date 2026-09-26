import { createFileRoute, redirect } from '@tanstack/react-router';
import { getPagesAdmin } from '@/features/admin/content';
import { PagesAdminPage } from '@/features/admin/PagesAdminPage';
import { ConsolePage } from '@/features/admin/console/ui';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/admin/pages/')({
  loader: async () => {
    const admin = await getPagesAdmin();
    if (!admin) throw redirect({ to: '/admin' });
    return admin;
  },
  head: () => ({ meta: [{ title: `${m.admin_pages()} — KYA-EnergyMarket` }] }),
  component: PagesAdminRoute,
});

function PagesAdminRoute() {
  return (
    <ConsolePage crumbs={[{ label: m.cx_nav_content() }, { label: m.cx_nav_pages() }]}>
      <PagesAdminPage pages={Route.useLoaderData().pages} />
    </ConsolePage>
  );
}
