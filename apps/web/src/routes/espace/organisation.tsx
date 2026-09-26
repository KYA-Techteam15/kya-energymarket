import { createFileRoute, redirect } from '@tanstack/react-router';
import { OrganizationPage } from '@/features/account/OrganizationPage';
import { getActiveOrganization } from '@/features/account/server';
import { getAuthCapabilities } from '@/features/auth/server';
import { m } from '@/paraglide/messages.js';

// Visible seulement pour une organisation d'entreprise (spec 002, FR-002).
export const Route = createFileRoute('/espace/organisation')({
  loader: async () => {
    const [organization, capabilities] = await Promise.all([getActiveOrganization(), getAuthCapabilities()]);
    if (!organization) throw redirect({ to: '/espace' });
    return { organization, mail: capabilities.magicLink };
  },
  head: () => ({ meta: [{ title: `${m.me_organization()} — KYA-EnergyMarket` }] }),
  component: OrganizationRoute,
});

function OrganizationRoute() {
  const { organization, mail } = Route.useLoaderData();
  return <OrganizationPage organization={organization} mail={mail} />;
}
