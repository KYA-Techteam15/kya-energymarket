import { createFileRoute, redirect } from '@tanstack/react-router';
import { getBatchFn } from '@/features/admin/batches/batches';
import { BatchPage } from '@/features/admin/batches/BatchPage';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/admin/lots/$id')({
  loader: async ({ params }) => {
    if (!/^[0-9a-f-]{36}$/u.test(params.id)) throw redirect({ to: '/admin/lots' });
    const data = await getBatchFn({ data: { id: params.id } });
    if (!data) throw redirect({ to: '/admin/lots' });
    return { data, now: Date.parse(new Date().toISOString()) };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.data.batch.label ?? m.cx_nav_batches()} — ${m.cx_brand()} KYA-EnergyMarket` }],
  }),
  component: BatchRoute,
});

function BatchRoute() {
  const { data, now } = Route.useLoaderData();
  return <BatchPage data={data} now={now} />;
}
