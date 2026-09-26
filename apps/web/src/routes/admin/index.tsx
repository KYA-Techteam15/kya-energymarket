import { createFileRoute, useLoaderData } from '@tanstack/react-router';
import { getDashboard } from '@/features/admin/console/console';
import { DashboardPage } from '@/features/admin/dashboard/DashboardPage';
import { m } from '@/paraglide/messages.js';

interface DashboardSearch {
  readonly periode?: string;
}

export const Route = createFileRoute('/admin/')({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    periode:
      typeof search.periode === 'string' && ['30j', '90j', '365j'].includes(search.periode)
        ? search.periode
        : undefined,
  }),
  loaderDeps: ({ search }) => ({ period: search.periode ?? '30j' }),
  loader: async ({ deps }) => ({ stats: await getDashboard({ data: { period: deps.period } }) }),
  head: () => ({ meta: [{ title: `${m.cx_nav_dashboard()} — ${m.cx_brand()} KYA-EnergyMarket` }] }),
  component: DashboardRoute,
});

function DashboardRoute() {
  const { stats } = Route.useLoaderData();
  const { context } = useLoaderData({ from: '/admin' });
  return <DashboardPage stats={stats} name={context?.name ?? ''} canWrite={context?.can.licenses.write ?? false} />;
}
