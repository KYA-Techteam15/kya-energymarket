import { createFileRoute, redirect } from '@tanstack/react-router';
import { listTeam } from '@/features/admin/server';
import { TeamPage } from '@/features/admin/TeamPage';
import { ConsolePage } from '@/features/admin/console/ui';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/admin/equipe')({
  loader: async () => {
    const team = await listTeam();
    if (!team) throw redirect({ to: '/admin' });
    return team;
  },
  head: () => ({ meta: [{ title: `${m.admin_team()} — KYA-EnergyMarket` }] }),
  component: TeamRoute,
});

function TeamRoute() {
  return (
    <ConsolePage crumbs={[{ label: m.cx_nav_system() }, { label: m.cx_nav_team() }]}>
      <TeamPage team={Route.useLoaderData()} />
    </ConsolePage>
  );
}
