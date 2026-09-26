import { createFileRoute, redirect } from '@tanstack/react-router';
import { InvitationPage } from '@/features/account/InvitationPage';
import { getInvitation } from '@/features/account/server';
import { getViewer } from '@/features/auth/server';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/invitation/$id')({
  beforeLoad: async ({ location }) => {
    if (!(await getViewer()))
      throw redirect({ to: '/connexion', search: { redirect: location.href, onglet: 'creer' } });
  },
  loader: ({ params }) => getInvitation({ data: params.id }),
  head: () => ({ meta: [{ title: `${m.invite_title()} — KYA-EnergyMarket` }, { name: 'robots', content: 'noindex' }] }),
  component: InvitationRoute,
});

function InvitationRoute() {
  return <InvitationPage invitation={Route.useLoaderData()} />;
}
