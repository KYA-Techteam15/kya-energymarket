import type { LicenseChannel, LicenseViewName } from '@kya-em/domain';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { CHANNELS, getLicenses, LICENSE_VIEWS } from '@/features/admin/licenses/licenses';
import { LicensesPage, type LicensesSearch } from '@/features/admin/licenses/LicensesPage';
import { m } from '@/paraglide/messages.js';

const text = (value: unknown, max: number) =>
  typeof value === 'string' && value.length > 0 && value.length <= max ? value : undefined;
const UUID = /^[0-9a-f-]{36}$/u;

export const Route = createFileRoute('/admin/licences/')({
  validateSearch: (search: Record<string, unknown>): LicensesSearch => {
    const debut = Number(search.debut);
    return {
      vue: (LICENSE_VIEWS as readonly string[]).includes(String(search.vue))
        ? (search.vue as LicenseViewName)
        : undefined,
      q: text(search.q, 120),
      edition: UUID.test(String(search.edition)) ? String(search.edition) : undefined,
      canal: (CHANNELS as readonly string[]).includes(String(search.canal))
        ? (search.canal as LicenseChannel)
        : undefined,
      lot: UUID.test(String(search.lot)) ? String(search.lot) : undefined,
      licence: text(search.licence, 40),
      emettre: search.emettre ? '1' : undefined,
      debut: Number.isInteger(debut) && debut > 0 ? debut : undefined,
    };
  },
  loaderDeps: ({ search }) => ({
    view: search.vue,
    query: search.q,
    editionId: search.edition,
    channel: search.canal,
    batchId: search.lot,
    offset: search.debut,
  }),
  loader: async ({ deps }) => {
    const data = await getLicenses({
      data: {
        view: deps.view ?? 'all',
        query: deps.query,
        editionId: deps.editionId,
        channel: deps.channel,
        batchId: deps.batchId,
        offset: deps.offset ?? 0,
        limit: 50,
      },
    });
    if (!data) throw redirect({ to: '/admin' });
    // Heure du chargement : le temps restant se calcule pareil au serveur et au navigateur.
    return { data, now: Date.parse(new Date().toISOString()) };
  },
  head: () => ({ meta: [{ title: `${m.cx_nav_licenses()} — ${m.cx_brand()} KYA-EnergyMarket` }] }),
  component: LicensesRoute,
});

function LicensesRoute() {
  const { data, now } = Route.useLoaderData();
  return <LicensesPage data={data} search={Route.useSearch()} now={now} />;
}
