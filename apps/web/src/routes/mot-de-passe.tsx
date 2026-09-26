import { createFileRoute } from '@tanstack/react-router';
import { getAuthCapabilities } from '@/features/auth/server';
import { PasswordPage } from '@/features/auth/PasswordPage';
import { baseUrlFrom, localizedLinks } from '@/features/i18n/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';

interface PasswordSearch {
  /** Jeton remis par Better Auth après le lien du courriel. */
  readonly token?: string;
  readonly error?: string;
}

export const Route = createFileRoute('/mot-de-passe')({
  validateSearch: (search: { token?: unknown; error?: unknown }): PasswordSearch => ({
    token: typeof search.token === 'string' && /^[\w-]{8,128}$/u.test(search.token) ? search.token : undefined,
    error: typeof search.error === 'string' ? 'INVALID_TOKEN' : undefined,
  }),
  loader: () => getAuthCapabilities(),
  head: ({ matches }) => ({
    meta: [{ title: `${m.pwd_title()} — KYA-EnergyMarket` }, { name: 'robots', content: 'noindex' }],
    links: localizedLinks('/mot-de-passe', getLocale(), baseUrlFrom(matches)),
  }),
  component: PasswordRoute,
});

function PasswordRoute() {
  const search = Route.useSearch();
  const capabilities = Route.useLoaderData();
  return <PasswordPage token={search.token} invalid={search.error !== undefined} mail={capabilities.magicLink} />;
}
