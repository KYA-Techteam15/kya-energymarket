import handler from '@tanstack/react-start/server-entry';
import { paraglideMiddleware } from './paraglide/server.js';

/**
 * Entrée serveur. Les pages passent par Paraglide (langue détectée, redirection éventuelle vers
 * l'adresse localisée) ; les API, le serveur MCP et la découverte OAuth ne sont jamais localisés.
 */
const UNLOCALIZED = ['/api', '/mcp', '/.well-known', '/media'];
export default {
  fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (UNLOCALIZED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return Promise.resolve(handler.fetch(request));
    }
    return paraglideMiddleware(request, () => handler.fetch(request));
  },
};
