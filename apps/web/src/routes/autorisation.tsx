import { createFileRoute } from '@tanstack/react-router';
import { ConsentPage } from '@/features/mcp/ConsentPage';
import { getConsent } from '@/features/mcp/server';
import { m } from '@/paraglide/messages.js';

/**
 * Autorisation OAuth d'un client IA sur le serveur MCP (spec 003). Better Auth y envoie la personne
 * avec une requête signée (`client_id`, `scope`, `sig`…) : l'adresse est laissée telle quelle, car le
 * client navigateur la renvoie pour prouver la demande.
 */
interface ConsentSearch {
  readonly client_id?: string;
  readonly scope?: string;
}

export const Route = createFileRoute('/autorisation')({
  validateSearch: (search: Record<string, unknown>): ConsentSearch => ({
    ...search,
    client_id: typeof search.client_id === 'string' ? search.client_id : undefined,
    scope: typeof search.scope === 'string' ? search.scope : undefined,
  }),
  loaderDeps: ({ search }) => ({ clientId: search.client_id ?? '', scope: search.scope ?? '' }),
  loader: async ({ deps }) => ({
    consent: await getConsent({ data: { id: deps.clientId || '?' } }),
    scopes: deps.scope.split(' ').filter(Boolean),
  }),
  head: () => ({
    meta: [{ title: `${m.consent_allow()} — KYA-EnergyMarket` }, { name: 'robots', content: 'noindex' }],
  }),
  component: ConsentRoute,
});

function ConsentRoute() {
  const { consent, scopes } = Route.useLoaderData();
  return <ConsentPage consent={consent} scopes={scopes} />;
}
