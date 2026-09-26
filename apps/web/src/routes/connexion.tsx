import { createFileRoute, redirect } from '@tanstack/react-router';
import { getAuthCapabilities, getViewer } from '@/features/auth/server';
import { SignInPage } from '@/features/auth/SignInPage';
import { baseUrlFrom, localizedLinks } from '@/features/i18n/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';

/** Seules les adresses internes sont acceptées pour le retour après connexion. */
const safeRedirect = (value: unknown): string | undefined =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : undefined;

interface SignInSearch {
  readonly redirect?: string;
  readonly onglet?: 'creer';
}

export const Route = createFileRoute('/connexion')({
  // Paramètres facultatifs dans les liens ; valeurs sûres après validation.
  validateSearch: (search: { redirect?: unknown; onglet?: unknown }): SignInSearch => ({
    redirect: safeRedirect(search.redirect),
    onglet: search.onglet === 'creer' ? ('creer' as const) : undefined,
  }),
  beforeLoad: async ({ search }) => {
    // « to » passe par la réécriture des adresses de langue (/fr, /en), contrairement à « href ».
    if (await getViewer()) throw redirect({ to: (search.redirect ?? '/espace') as '/espace' });
  },
  loader: () => getAuthCapabilities(),
  head: ({ matches }) => ({
    meta: [{ title: `${m.nav_sign_in()} — KYA-EnergyMarket` }],
    links: localizedLinks('/connexion', getLocale(), baseUrlFrom(matches)),
  }),
  component: SignInRoute,
});

function SignInRoute() {
  const search = Route.useSearch();
  const capabilities = Route.useLoaderData();
  return (
    <SignInPage
      initialTab={search.onglet === 'creer' ? 'up' : 'in'}
      redirectTo={search.redirect ?? '/espace'}
      magicLink={capabilities.magicLink}
      available={capabilities.available}
    />
  );
}
