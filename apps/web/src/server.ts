import handler from '@tanstack/react-start/server-entry';
import { paraglideMiddleware } from './paraglide/server.js';

/**
 * Entrée serveur. Les pages passent par Paraglide (langue détectée, redirection éventuelle vers
 * l'adresse localisée) ; les API ne sont jamais localisées ni redirigées.
 */
export default {
  fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api' || pathname.startsWith('/api/')) return Promise.resolve(handler.fetch(request));
    return paraglideMiddleware(request, () => handler.fetch(request));
  },
};
