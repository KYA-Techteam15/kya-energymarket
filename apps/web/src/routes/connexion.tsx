import { createFileRoute } from '@tanstack/react-router';
import { SignInPage } from '@/features/account/SignInPage';
import { localizedLinks } from '@/features/i18n/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';

export const Route = createFileRoute('/connexion')({
  head: () => ({
    meta: [{ title: `${m.sign_in_title()} — KYA-EnergyMarket` }],
    links: localizedLinks('/connexion', getLocale()),
  }),
  component: SignInPage,
});
