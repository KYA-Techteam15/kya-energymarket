import { HeadContent, Scripts } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from './Footer';
import { MarketHeader } from './MarketHeader';

/** Document HTML commun : langue, lien d'évitement, en-tête de la marketplace, pied de page. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <html lang={getLocale()}>
      <head>
        <HeadContent />
      </head>
      <body>
        <a className="skip" href="#contenu">
          {m.skip_to_content()}
        </a>
        <MarketHeader />
        <main id="contenu">{children}</main>
        <Footer />
        <Scripts />
      </body>
    </html>
  );
}
