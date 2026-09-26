import { createFileRoute, redirect } from '@tanstack/react-router';
import { getMediaAdmin } from '@/features/admin/content';
import { MediaAdminPage } from '@/features/admin/MediaAdminPage';
import { ConsolePage } from '@/features/admin/console/ui';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/admin/medias')({
  loader: async () => {
    const admin = await getMediaAdmin();
    if (!admin) throw redirect({ to: '/admin' });
    return admin;
  },
  head: () => ({ meta: [{ title: `${m.admin_media()} — KYA-EnergyMarket` }] }),
  component: MediaAdminRoute,
});

function MediaAdminRoute() {
  return (
    <ConsolePage crumbs={[{ label: m.cx_nav_content() }, { label: m.cx_nav_media() }]}>
      <MediaAdminPage admin={Route.useLoaderData()} />
    </ConsolePage>
  );
}
