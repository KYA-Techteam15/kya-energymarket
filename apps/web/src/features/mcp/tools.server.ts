import type { Database } from '@kya-em/db';
import { findCustomers, listStaff, recordAuditEvent, type Logger } from '@kya-em/domain';
import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { registerContentTools } from './tools-content.server';
import { registerLicenseTools } from './tools-licenses.server';

/** Personne derrière l'appel : membre de l'équipe KYA, rôle relu en base à chaque requête. */
export interface McpCaller {
  readonly staff: { id: string; name: string; email: string; roles: readonly string[] };
  readonly clientId: string;
  readonly scopes: readonly string[];
}

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

/** Réponse d'outil : texte JSON lisible par tout client, et contenu structuré validé par le schéma. */
const result = <T extends Record<string, unknown>>(value: T) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  structuredContent: value,
});

/**
 * Serveur MCP de KYA-EnergyMarket (spec 003), construit pour une requête et une personne. Chaque
 * outil appelle un service de `@kya-em/domain` et laisse une trace d'audit ; aucune valeur secrète
 * n'est rendue. Les outils d'écriture viendront avec les spécifications qui les apportent.
 */
export function createKyaMcpServer(context: {
  db: Database;
  logger: Logger;
  version: string;
  caller: McpCaller;
  /** Secret du serveur : clés de licence chiffrées au repos. */
  secret: string;
}) {
  const { db, logger, caller } = context;
  const server = new McpServer({ name: 'kya-energy-market', version: context.version });

  const audited = async <T>(tool: string, run: () => Promise<T>): Promise<T> => {
    const trace = (outcome: 'success' | 'failure') =>
      recordAuditEvent(db, {
        actorType: 'mcp_client',
        actorId: caller.staff.id,
        action: 'mcp.tool_called',
        resourceType: 'mcp_tool',
        resourceId: tool,
        outcome,
        details: { client: caller.clientId },
      }).catch((error: unknown) => logger.error({ err: error }, 'audit MCP impossible'));
    try {
      const value = await run();
      await trace('success');
      return value;
    } catch (error) {
      await trace('failure');
      throw error;
    }
  };

  server.registerTool(
    'whoami',
    {
      title: 'Qui suis-je ?',
      description:
        "Identité du membre de l'équipe KYA connecté par ce client, ses rôles d'équipe et les portées accordées au client.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        staffRoles: z.array(z.string()),
        scopes: z.array(z.string()),
        client: z.string(),
      }),
      annotations: READ_ONLY,
    },
    async () =>
      audited('whoami', async () =>
        result({
          id: caller.staff.id,
          name: caller.staff.name,
          email: caller.staff.email,
          staffRoles: [...caller.staff.roles],
          scopes: [...caller.scopes],
          client: caller.clientId,
        }),
      ),
  );

  server.registerTool(
    'list_staff',
    {
      title: 'Équipe KYA',
      description:
        "Membres de l'équipe KYA (nom, courriel) et leurs rôles : kya_admin, kya_sales, kya_content, kya_support.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        members: z.array(z.object({ id: z.string(), name: z.string(), email: z.string(), roles: z.array(z.string()) })),
      }),
      annotations: READ_ONLY,
    },
    async () =>
      audited('list_staff', async () => {
        const members = await listStaff(db);
        return result({ members: members.map((member) => ({ ...member, roles: [...member.roles] })) });
      }),
  );

  server.registerTool(
    'find_customer',
    {
      title: 'Trouver un client',
      description:
        "Recherche de comptes par courriel ou par nom (2 caractères au moins). Rend nom, courriel, adresse vérifiée ou non, date d'inscription, organisations d'entreprise et rôles d'équipe ; 20 résultats au plus.",
      inputSchema: z.object({
        query: z.string().min(2).max(120).describe('Tout ou partie du courriel ou du nom'),
        limit: z.number().int().min(1).max(20).optional().describe('Nombre de résultats (20 au plus)'),
      }),
      outputSchema: z.object({
        customers: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
            emailVerified: z.boolean(),
            createdAt: z.string(),
            organizations: z.array(z.object({ id: z.string(), name: z.string(), role: z.string() })),
            staffRoles: z.array(z.string()),
          }),
        ),
      }),
      annotations: READ_ONLY,
    },
    async ({ query, limit }) =>
      audited('find_customer', async () => {
        const customers = await findCustomers(db, { query, limit });
        return result({
          customers: customers.map((customer) => ({
            ...customer,
            organizations: [...customer.organizations],
            staffRoles: [...customer.staffRoles],
          })),
        });
      }),
  );

  registerContentTools(server, { db, logger, caller });
  registerLicenseTools(server, { db, secret: context.secret, logger, caller });
  return server;
}
