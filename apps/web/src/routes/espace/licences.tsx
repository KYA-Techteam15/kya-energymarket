import { createFileRoute, redirect } from '@tanstack/react-router';
import { LicencesPage } from '@/features/licensing/LicencesPage';
import { getMyLicenses } from '@/features/licensing/server';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/espace/licences')({
  loader: async () => {
    const licenses = await getMyLicenses();
    if (!licenses) throw redirect({ to: '/connexion' });
    return licenses;
  },
  head: () => ({ meta: [{ title: `${m.account_licences_title()} — KYA-EnergyMarket` }] }),
  component: LicencesRoute,
});

function LicencesRoute() {
  return <LicencesPage licenses={Route.useLoaderData()} />;
}
