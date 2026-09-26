import { HeadContent, Scripts, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from './Footer';
import { MarketHeader } from './MarketHeader';

/**
 * Document HTML commun : langue, lien d'évitement, en-tête de la marketplace, pied de page. La console
 * d'administration (`/admin`, spec 005b) a son propre habillage : ni en-tête ni pied de page du site.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const isConsole = useRouterState({ select: (state) => /^\/admin(\/|$)/u.test(state.location.pathname) });
  return (
    <html lang={getLocale()}>
      <head>
        <HeadContent />
      </head>
      <body>
        <a className="skip" href="#contenu">
          {m.skip_to_content()}
        </a>
        {isConsole ? (
          children
        ) : (
          <>
            <MarketHeader />
            <main id="contenu">{children}</main>
            <Footer />
          </>
        )}
        <Scripts />
      </body>
    </html>
  );
}
