import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      outputStructure: 'message-modules',
      cookieName: 'KYA_LOCALE',
      // Adresse, puis choix mémorisé, puis langue du navigateur, puis français (spec 001, FR-008).
      // Les deux langues sont préfixées : la racine « / » redirige selon ce choix.
      strategy: ['url', 'cookie', 'preferredLanguage', 'baseLocale'],
      urlPatterns: [
        {
          pattern: '/:path(.*)?',
          localized: [
            ['fr', '/fr/:path(.*)?'],
            ['en', '/en/:path(.*)?'],
          ],
        },
      ],
    }),
    tanstackStart(),
    // Serveur Node autonome (.output/server/index.mjs) pour l'image Docker et Coolify.
    nitro(),
    viteReact(),
  ],
});
