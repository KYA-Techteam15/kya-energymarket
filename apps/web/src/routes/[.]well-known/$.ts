import { createFileRoute } from '@tanstack/react-router';
import { authHandler } from '@/features/auth/session.server';

/**
 * Chemins de découverte que Better Auth ne sert pas à la racine : ils désignent le même serveur
 * d'autorisation (émetteur `/api/auth`), servi sous son chemin de base.
 */
const ALIASES: Record<string, string> = {
  '/.well-known/oauth-authorization-server': '/api/auth/.well-known/oauth-authorization-server',
  '/.well-known/openid-configuration': '/api/auth/.well-known/openid-configuration',
  '/.well-known/openid-configuration/api/auth': '/api/auth/.well-known/openid-configuration',
};

function discovery(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const alias = ALIASES[url.pathname.replace(/\/+$/u, '')];
  if (!alias) return authHandler(request);
  return authHandler(new Request(new URL(alias, url.origin), { method: request.method, headers: request.headers }));
}

// Découverte OAuth à la racine du site (spec 003, FR-003) : métadonnées du serveur d'autorisation
// (RFC 8414, OpenID) et de la ressource protégée /mcp (RFC 9728). Better Auth les reconnaît au chemin.
export const Route = createFileRoute('/.well-known/$')({
  server: {
    handlers: {
      GET: ({ request }) => discovery(request),
      HEAD: ({ request }) => discovery(request),
    },
  },
});
