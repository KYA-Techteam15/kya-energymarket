import { createFileRoute, redirect } from '@tanstack/react-router';
import { BatchWizardPage } from '@/features/admin/batches/BatchWizardPage';
import { getOfferFn } from '@/features/admin/licenses/licenses';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/admin/lots/nouveau')({
  loader: async () => {
    const offer = await getOfferFn();
    if (!offer) throw redirect({ to: '/admin/lots' });
    return { offer };
  },
  head: () => ({ meta: [{ title: `${m.cx_generate()} — ${m.cx_brand()} KYA-EnergyMarket` }] }),
  component: WizardRoute,
});

function WizardRoute() {
  return <BatchWizardPage offer={Route.useLoaderData().offer} />;
}
