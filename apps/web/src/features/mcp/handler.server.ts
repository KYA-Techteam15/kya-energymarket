import { MCP_READ_SCOPE, mcpResourceOf, requireMcpAuth } from '@kya-em/auth';
import { hasMcpConnection, staffMemberById } from '@kya-em/domain';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { runtime } from '@/shared/server/runtime.server';
import { createKyaMcpServer, type McpCaller } from './tools.server';

/** Erreur JSON-RPC hors protocole MCP (accès refusé après vérification du jeton). */
const denied = (message: string) =>
  Response.json({ jsonrpc: '2.0', id: null, error: { code: -32001, message } }, { status: 403 });

let handler: ((request: Request) => Promise<Response>) | undefined;

/**
 * `/mcp` (spec 003) : jeton OAuth vérifié par Better Auth (signature JWKS, émetteur, audience exacte
 * `/mcp`, expiration, portée `admin:read`), puis, à chaque requête, rôle d'équipe KYA relu en base et
 * autorisation du client toujours en vigueur. Serveur MCP sans état, révisions 2026-07-28 et 2025.
 */
export function mcpHandler(request: Request): Promise<Response> {
  const { auth, database, env, logger, secret } = runtime();
  if (!auth || !database) return Promise.resolve(Response.json({ error: 'MCP_UNAVAILABLE' }, { status: 503 }));

  handler ??= (() => {
    const mcp = createMcpHandler(
      (context) =>
        createKyaMcpServer({
          db: database.db,
          logger,
          version: env.APP_VERSION,
          secret,
          caller: context.authInfo?.extra?.caller as McpCaller,
        }),
      { onerror: (error) => logger.warn({ err: error }, 'MCP : requête refusée') },
    );
    return requireMcpAuth(
      auth,
      async (verified, claims) => {
        const staff = typeof claims.sub === 'string' ? await staffMemberById(database.db, claims.sub) : null;
        if (!staff) return denied("Serveur MCP réservé à l'équipe KYA.");
        const clientId = String(claims.azp ?? claims.client_id ?? '');
        if (!clientId || !(await hasMcpConnection(database.db, staff.id, clientId))) {
          return denied('Autorisation de ce client retirée : reconnectez-le.');
        }
        const scopes = typeof claims.scope === 'string' ? claims.scope.split(' ').filter(Boolean) : [];
        const caller: McpCaller = { staff, clientId, scopes };
        return mcp.fetch(verified, { authInfo: { token: '', clientId, scopes, extra: { caller } } });
      },
      {
        resource: mcpResourceOf(env.APP_BASE_URL),
        requiredScopes: [MCP_READ_SCOPE],
        // Clés publiques lues sur le serveur lui-même, sans repasser par l'adresse publique (proxy, DNS).
        jwksUrl: `http://127.0.0.1:${process.env.PORT ?? '3000'}/api/auth/jwks`,
      },
    );
  })();
  return handler(request);
}
