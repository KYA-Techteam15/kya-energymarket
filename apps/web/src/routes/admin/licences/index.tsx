import { createFileRoute, redirect } from '@tanstack/react-router';
import { getLicensesAdmin } from '@/features/admin/licenses';
import { LicensesAdminPage } from '@/features/admin/LicensesAdminPage';
import { m } from '@/paraglide/messages.js';

interface LicensesSearch {
  readonly q?: string;
}

export const Route = createFileRoute('/admin/licences/')({
  validateSearch: (search: Record<string, unknown>): LicensesSearch => ({
    q: typeof search.q === 'string' && search.q.length <= 120 ? search.q : undefined,
  }),
  loaderDeps: ({ search }) => ({ query: search.q ?? '' }),
  loader: async ({ deps }) => {
    const admin = await getLicensesAdmin({ data: { query: deps.query } });
    if (!admin) throw redirect({ to: '/admin' });
    return admin;
  },
  head: () => ({ meta: [{ title: `${m.admin_licenses()} — KYA-EnergyMarket` }] }),
  component: LicensesAdminRoute,
});

function LicensesAdminRoute() {
  return <LicensesAdminPage admin={Route.useLoaderData()} query={Route.useSearch().q ?? ''} />;
}
