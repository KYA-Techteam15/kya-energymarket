import { createFileRoute, redirect } from '@tanstack/react-router';
import { AccountLayout } from '@/features/account/AccountLayout';
import { getViewer } from '@/features/auth/server';

// Espace client : session obligatoire, vérifiée côté serveur (spec 002, FR-006).
export const Route = createFileRoute('/espace')({
  beforeLoad: async ({ location }) => {
    const viewer = await getViewer();
    if (!viewer) throw redirect({ to: '/connexion', search: { redirect: location.href, onglet: undefined } });
    return { viewer };
  },
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
  component: AccountLayout,
});
