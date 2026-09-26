import { createFileRoute, redirect } from '@tanstack/react-router';
import { getBatches } from '@/features/admin/batches/batches';
import { BatchesPage } from '@/features/admin/batches/BatchesPage';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/admin/lots/')({
  loader: async () => {
    const data = await getBatches();
    if (!data) throw redirect({ to: '/admin' });
    return data;
  },
  head: () => ({ meta: [{ title: `${m.cx_nav_batches()} — ${m.cx_brand()} KYA-EnergyMarket` }] }),
  component: BatchesRoute,
});

function BatchesRoute() {
  return <BatchesPage data={Route.useLoaderData()} />;
}
