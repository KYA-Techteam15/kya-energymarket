import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { getConsoleContext } from '@/features/admin/console/console';
import { ConsoleLayout } from '@/features/admin/console/ConsoleLayout';
import { getViewer } from '@/features/auth/server';
import { m } from '@/paraglide/messages.js';

// Console : session obligatoire ; le rôle d'équipe est revérifié par chaque fonction serveur (FR-006).
export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    const viewer = await getViewer();
    if (!viewer) throw redirect({ to: '/connexion', search: { redirect: location.href, onglet: undefined } });
    return { viewer };
  },
  loader: async () => ({ context: await getConsoleContext() }),
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
  component: AdminRoute,
});

function AdminRoute() {
  const { context } = Route.useLoaderData();
  if (!context) {
    return (
      <main className="wrap page-head" id="contenu">
        <h1>{m.admin_denied_title()}</h1>
        <p>{m.admin_denied_text()}</p>
        <p>
          <Link className="btn btn-primary" to="/espace">
            {m.me_dashboard()}
          </Link>
        </p>
      </main>
    );
  }
  return <ConsoleLayout context={context} />;
}
