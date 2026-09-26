/// <reference types="vite/client" />
import { createRootRoute } from '@tanstack/react-router';
import { getViewer } from '@/features/auth/server';
import { getCatalogSummary } from '@/features/catalog/server';
import { getPublicConfig } from '@/features/i18n/seo';
import { AppShell } from '@/features/shell/AppShell';
import { NotFoundPage } from '@/features/shell/NotFoundPage';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import appCss from '@/styles/app.css?url';

export const Route = createRootRoute({
  // Configuration publique (adresse du site), personne connectée et catalogue (en-tête, pied de page),
  // lus côté serveur puis transmis au navigateur.
  loader: async () => {
    const [config, viewer, catalog] = await Promise.all([
      getPublicConfig(),
      getViewer(),
      getCatalogSummary({ data: { locale: getLocale() } }),
    ]);
    return { ...config, viewer, catalog };
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: m.meta_title() },
      { name: 'description', content: m.meta_description() },
      { name: 'theme-color', content: '#ffffff' },
      { property: 'og:site_name', content: 'KYA-EnergyMarket' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/images/kya-mark.png', type: 'image/png' },
    ],
  }),
  shellComponent: AppShell,
  notFoundComponent: NotFoundPage,
});
