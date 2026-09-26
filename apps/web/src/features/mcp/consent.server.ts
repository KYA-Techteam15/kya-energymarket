import { isStaff, mcpResourceOf } from '@kya-em/auth';
import { listMcpConnections, revokeMcpConnection } from '@kya-em/domain';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { runtime } from '@/shared/server/runtime.server';

async function currentSession() {
  const { auth, database } = runtime();
  if (!auth || !database) return null;
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  if (!session) return null;
  const role = (session.user as { role?: string | null }).role ?? null;
  return { auth, db: database.db, headers, session, staff: isStaff(role) };
}

/**
 * Page d'autorisation (spec 003) : qui autorise, quel client, et si la personne en a le droit.
 * Le droit est revérifié à l'émission du jeton : cette page n'est qu'une première barrière.
 */
export async function loadConsent(clientId: string) {
  const current = await currentSession();
  if (!current) return { signedIn: false as const };
  const client = await current.auth.api
    .getOAuthClientPublic({ query: { client_id: clientId }, headers: current.headers })
    .catch(() => null);
  return {
    signedIn: true as const,
    staff: current.staff,
    name: current.session.user.name,
    email: current.session.user.email,
    client: client
      ? { name: client.client_name ?? clientId, uri: client.client_uri ?? null }
      : { name: clientId, uri: null },
  };
}

/** Administration « MCP » : adresse du serveur et clients autorisés par la personne. */
export async function loadMcpAdmin() {
  const current = await currentSession();
  if (!current?.staff) return null;
  return {
    serverUrl: mcpResourceOf(runtime().env.APP_BASE_URL),
    connections: await listMcpConnections(current.db, current.session.user.id),
  };
}

export async function revokeConnection(connectionId: string) {
  const current = await currentSession();
  if (!current?.staff) return { ok: false as const };
  const ok = await revokeMcpConnection(current.db, { userId: current.session.user.id, connectionId });
  return { ok };
}
