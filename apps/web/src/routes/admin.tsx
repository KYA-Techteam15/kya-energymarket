import { createFileRoute, redirect } from '@tanstack/react-router';
import { AdminLayout } from '@/features/admin/AdminLayout';
import { getViewer } from '@/features/auth/server';

// Administration : session obligatoire ; le rôle d'équipe est revérifié par chaque fonction serveur (FR-006).
export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    const viewer = await getViewer();
    if (!viewer) throw redirect({ to: '/connexion', search: { redirect: location.href, onglet: undefined } });
    return { viewer };
  },
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
  component: AdminLayout,
});
