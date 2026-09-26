import { createRouter } from '@tanstack/react-router';
import { deLocalizeUrl, localizeUrl } from './paraglide/runtime.js';
import { routeTree } from './routeTree.gen';

export const getRouter = () =>
  createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // Les routes sont écrites sans langue ; l'adresse visible porte `/en` pour l'anglais.
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
  });
