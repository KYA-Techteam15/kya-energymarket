import { oauthClient, oauthConsent, oauthRefreshToken, type Database } from '@kya-em/db';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { recordAuditEvent } from '../audit/recordAuditEvent.ts';

/**
 * Connexions MCP d'un membre de l'équipe KYA (spec 003) : un client IA (Claude, Codex…) qu'il a
 * autorisé. Le consentement OAuth est la source : sans lui, `/mcp` refuse le client, même avec un
 * jeton encore valide (révocation immédiate).
 */
export interface McpConnection {
  readonly id: string;
  readonly clientId: string;
  readonly clientName: string;
  readonly clientUri: string | null;
  readonly scopes: readonly string[];
  readonly createdAt: string;
}

export async function listMcpConnections(db: Database, userId: string): Promise<McpConnection[]> {
  const rows = await db
    .select({
      id: oauthConsent.id,
      clientId: oauthConsent.clientId,
      name: oauthClient.name,
      uri: oauthClient.uri,
      scopes: oauthConsent.scopes,
      createdAt: oauthConsent.createdAt,
    })
    .from(oauthConsent)
    .innerJoin(oauthClient, eq(oauthConsent.clientId, oauthClient.clientId))
    .where(eq(oauthConsent.userId, userId))
    .orderBy(desc(oauthConsent.createdAt));
  return rows.map((row) => ({
    id: row.id,
    clientId: row.clientId,
    clientName: row.name ?? row.clientId,
    clientUri: row.uri,
    scopes: row.scopes,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function hasMcpConnection(db: Database, userId: string, clientId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: oauthConsent.id })
    .from(oauthConsent)
    .innerJoin(oauthClient, eq(oauthConsent.clientId, oauthClient.clientId))
    .where(and(eq(oauthConsent.userId, userId), eq(oauthConsent.clientId, clientId)))
    .limit(1);
  return row !== undefined;
}

/** Retire l'autorisation d'un client : consentement supprimé, jetons de rafraîchissement révoqués. */
export async function revokeMcpConnection(db: Database, input: { userId: string; connectionId: string }) {
  const [consent] = await db
    .select({ id: oauthConsent.id, clientId: oauthConsent.clientId })
    .from(oauthConsent)
    .where(and(eq(oauthConsent.id, input.connectionId), eq(oauthConsent.userId, input.userId)))
    .limit(1);
  if (!consent) return false;
  await db.transaction(async (tx) => {
    await tx.delete(oauthConsent).where(eq(oauthConsent.id, consent.id));
    await tx
      .update(oauthRefreshToken)
      .set({ revoked: new Date() })
      .where(
        and(
          eq(oauthRefreshToken.userId, input.userId),
          eq(oauthRefreshToken.clientId, consent.clientId),
          isNull(oauthRefreshToken.revoked),
        ),
      );
  });
  await recordAuditEvent(db, {
    actorType: 'kya_staff',
    actorId: input.userId,
    action: 'mcp.connection_revoked',
    resourceType: 'oauth_client',
    resourceId: consent.clientId,
    outcome: 'success',
  });
  return true;
}
