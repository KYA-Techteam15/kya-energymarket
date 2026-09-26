import { createFileRoute, redirect } from '@tanstack/react-router';
import { getJournal } from '@/features/admin/console/console';
import { JournalPage, type JournalSearch } from '@/features/admin/journal/JournalPage';
import { m } from '@/paraglide/messages.js';

const text = (value: unknown) => (typeof value === 'string' && /^[a-z_]{2,20}$/u.test(value) ? value : undefined);

export const Route = createFileRoute('/admin/journal')({
  validateSearch: (search: Record<string, unknown>): JournalSearch => ({
    acteur: text(search.acteur),
    objet: text(search.objet),
  }),
  loaderDeps: ({ search }) => ({ actorType: search.acteur, resourceType: search.objet }),
  loader: async ({ deps }) => {
    const entries = await getJournal({ data: deps });
    if (!entries) throw redirect({ to: '/admin' });
    return entries;
  },
  head: () => ({ meta: [{ title: `${m.cx_nav_journal()} — ${m.cx_brand()} KYA-EnergyMarket` }] }),
  component: JournalRoute,
});

function JournalRoute() {
  return <JournalPage entries={Route.useLoaderData()} search={Route.useSearch()} />;
}
