import { staffCan } from '@kya-em/auth';
import type { Database } from '@kya-em/db';
import {
  DURATIONS,
  extendLicense,
  findLicenses,
  getLicense,
  issueLicense,
  LicenseError,
  licenseJournal,
  organizationForEmail,
  recordAuditEvent,
  releaseSeat,
  revokeLicense,
  setLicenseSeats,
  type Logger,
} from '@kya-em/domain';
import type { McpServer } from '@modelcontextprotocol/server';
import { z, ZodError } from 'zod';
import type { McpCaller } from './tools.server';

/**
 * Outils MCP des licences (spec 005, histoire 4). Portée `admin:licenses` pour écrire, droits
 * d'équipe `licenses:read|write|revoke` comme dans l'administration ; chaque appel est tracé.
 */
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;
const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] });
const refuse = (message: string) => ({ content: [{ type: 'text' as const, text: message }], isError: true });
const licenseId = z.string().min(4).max(40).describe('Identifiant de la licence (lic_…)');

export function registerLicenseTools(
  server: McpServer,
  context: { db: Database; secret: string; logger: Logger; caller: McpCaller },
) {
  const { db, secret, logger, caller } = context;
  const role = caller.staff.roles.join(',');
  const actor = { type: 'mcp_client' as const, id: caller.staff.id };

  const guarded = async (
    tool: string,
    need: { scope: string; action: string },
    run: () => Promise<ReturnType<typeof text>>,
  ) => {
    if (!caller.scopes.includes(need.scope)) {
      return refuse(`Portée « ${need.scope} » non accordée à ce client : reconnectez-le pour l'autoriser.`);
    }
    if (!staffCan(role, 'licenses', need.action))
      return refuse(`Votre rôle d'équipe ne permet pas « licenses:${need.action} ».`);
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
      if (error instanceof LicenseError) return refuse(error.code);
      if (error instanceof ZodError)
        return refuse(`Entrée refusée : ${error.issues.map((issue) => issue.message).join(' ; ')}`);
      throw error;
    }
  };

  server.registerTool(
    'find_license',
    {
      title: 'Trouver une licence',
      description:
        'Cherche des licences par clé, identifiant, nom du client ou courriel d’un membre de l’organisation. Rend clé, offre, dates, postes actifs. Avec `licenseId`, rend aussi le journal.',
      inputSchema: z.object({ query: z.string().max(120).optional(), licenseId: licenseId.optional() }),
      annotations: READ_ONLY,
    },
    async ({ query, licenseId: id }) =>
      guarded('find_license', { scope: 'admin:read', action: 'read' }, async () => {
        if (id) {
          const license = await getLicense({ db, secret }, id);
          return text(license ? { license, journal: await licenseJournal(db, id) } : { error: 'LICENSE_NOT_FOUND' });
        }
        return text(await findLicenses({ db, secret }, query ?? ''));
      }),
  );

  server.registerTool(
    'issue_license',
    {
      title: 'Émettre une licence',
      description:
        'Émet une licence KYA-SolDesign au nom de l’organisation du compte donné (son entreprise si elle en a une, sinon la personnelle). Rend l’identifiant et la clé.',
      inputSchema: z.object({
        ownerEmail: z.email(),
        edition: z.string().describe('commercial, academic, student…'),
        duration: z.enum(DURATIONS),
        seats: z.number().int().min(1).max(10_000),
      }),
      annotations: WRITE,
    },
    async ({ ownerEmail, edition, duration, seats }) =>
      guarded('issue_license', { scope: 'admin:licenses', action: 'write' }, async () => {
        const organizationId = await organizationForEmail(db, ownerEmail);
        if (!organizationId) return refuse('ACCOUNT_NOT_FOUND : la personne doit d’abord créer son compte.');
        const { license, key } = await issueLicense({ db, secret }, actor, {
          productSlug: 'kya-soldesign',
          editionCode: edition,
          duration,
          seats,
          organizationId,
          source: 'manual',
        });
        return text({ ok: true, licenseId: license.id, key, expiresAt: license.expiresAt.toISOString() });
      }),
  );

  server.registerTool(
    'extend_license',
    {
      title: 'Prolonger une licence',
      description: 'Fixe une nouvelle date de fin (ISO 8601). Le logiciel la reçoit à son prochain rafraîchissement.',
      inputSchema: z.object({ licenseId, expiresAt: z.iso.datetime() }),
      annotations: { ...WRITE, idempotentHint: true },
    },
    async ({ licenseId: id, expiresAt }) =>
      guarded('extend_license', { scope: 'admin:licenses', action: 'write' }, async () => {
        await extendLicense(db, actor, { licenseId: id, expiresAt: new Date(expiresAt) });
        return text({ ok: true, licenseId: id, expiresAt });
      }),
  );

  server.registerTool(
    'set_license_seats',
    {
      title: 'Nombre de postes',
      description: 'Change le nombre de postes (jamais sous le nombre d’ordinateurs actifs).',
      inputSchema: z.object({ licenseId, seats: z.number().int().min(1).max(10_000) }),
      annotations: { ...WRITE, idempotentHint: true },
    },
    async ({ licenseId: id, seats }) =>
      guarded('set_license_seats', { scope: 'admin:licenses', action: 'write' }, async () => {
        await setLicenseSeats(db, actor, { licenseId: id, seats });
        return text({ ok: true, licenseId: id, seats });
      }),
  );

  server.registerTool(
    'release_seat',
    {
      title: 'Libérer un poste',
      description:
        'Libère un ordinateur (identifiant d’activation rendu par find_license) : il passe en lecture seule à sa prochaine connexion.',
      inputSchema: z.object({ licenseId, activationId: z.string().uuid() }),
      annotations: { ...WRITE, idempotentHint: true },
    },
    async ({ licenseId: id, activationId }) =>
      guarded('release_seat', { scope: 'admin:licenses', action: 'write' }, async () => {
        const released = await releaseSeat(db, actor, { licenseId: id, activationId });
        return text({ ok: released });
      }),
  );

  server.registerTool(
    'revoke_license',
    {
      title: 'Révoquer une licence',
      description:
        'Révoque définitivement une licence : ses postes reçoivent LICENSE_REVOKED au prochain rafraîchissement et la clé ne s’active plus. Action à impact : `confirm` doit valoir true.',
      inputSchema: z.object({ licenseId, confirm: z.literal(true).describe('Confirmation explicite') }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ licenseId: id }) =>
      guarded('revoke_license', { scope: 'admin:licenses', action: 'revoke' }, async () => {
        await revokeLicense(db, actor, { licenseId: id });
        return text({ ok: true, licenseId: id, status: 'revoked' });
      }),
  );
}
