import { staffCan } from '@kya-em/auth';
import type { Database } from '@kya-em/db';
import {
  BatchInput,
  CHANNELS,
  dashboardStats,
  extendLicense,
  findLicenses,
  generateBatch,
  getBatch,
  getLicense,
  issueLicense,
  LICENSE_VIEWS,
  LicenseError,
  licenseJournal,
  listBatches,
  organizationForEmail,
  PERIODS,
  recordAuditEvent,
  releaseSeat,
  resendLicenseKey,
  revokeLicense,
  setLicenseSeats,
  type Logger,
  type Period,
} from '@kya-em/domain';
import type { McpServer } from '@modelcontextprotocol/server';
import { z, ZodError } from 'zod';
import type { McpCaller } from './tools.server';

/**
 * Outils MCP des licences (spec 005, 005b). Portée `admin:licenses` pour écrire, droits d'équipe
 * `licenses:read|write|revoke` et `stats:read` comme dans la console ; chaque appel est tracé.
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
    need: { scope: string; action: string; resource?: 'licenses' | 'stats' },
    run: () => Promise<ReturnType<typeof text>>,
  ) => {
    if (!caller.scopes.includes(need.scope)) {
      return refuse(`Portée « ${need.scope} » non accordée à ce client : reconnectez-le pour l'autoriser.`);
    }
    const resource = need.resource ?? 'licenses';
    if (!staffCan(role, resource, need.action))
      return refuse(`Votre rôle d'équipe ne permet pas « ${resource}:${need.action} ».`);
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
        return refuse(
          `Entrée refusée : ${error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join(' ; ')}`,
        );
      throw error;
    }
  };

  server.registerTool(
    'find_license',
    {
      title: 'Trouver des licences',
      description:
        'Cherche des licences par clé, identifiant, nom du titulaire, courriel (destinataire ou membre de l’organisation) ou référence ; `view` filtre (all, expiring, purchased, offered, trials, waiting = jamais activées, revoked). Rend l’offre figée à l’émission (type, jours, prix, montant, canal, motif), les dates, les postes actifs et le compte de chaque vue. Avec `licenseId`, rend aussi le journal.',
      inputSchema: z.object({
        query: z.string().max(120).optional(),
        view: z.enum(LICENSE_VIEWS).optional(),
        batchId: z.uuid().optional().describe('Licences d’un lot'),
        licenseId: licenseId.optional(),
      }),
      annotations: READ_ONLY,
    },
    async ({ query, view, batchId, licenseId: id }) =>
      guarded('find_license', { scope: 'admin:read', action: 'read' }, async () => {
        if (id) {
          const license = await getLicense({ db, secret }, id);
          return text(license ? { license, journal: await licenseJournal(db, id) } : { error: 'LICENSE_NOT_FOUND' });
        }
        return text(await findLicenses({ db, secret }, { query, view, batchId, limit: 50 }));
      }),
  );

  server.registerTool(
    'issue_license',
    {
      title: 'Émettre une licence',
      description:
        'Émet une licence d’un type de licence (identifiant lu par get_product, types masqués compris). Titulaire : `ownerEmail` (organisation de ce compte : son entreprise, sinon la personnelle) ; sinon `recipientEmail` (sans compte : rattachée quand la personne se connecte avec ce courriel) ; sinon clé à distribuer (`customerName` affiché dans le logiciel). `channel` : staff (attribution par l’équipe), purchase (achat hors plateforme, avec `amount` et `reference`), partner. `reason` obligatoire hors achat. La licence garde une copie figée du type (prix, durée). `idempotencyKey` : rejouer ne crée rien de plus. Rend l’identifiant et la clé.',
      inputSchema: z.object({
        licenseTypeId: z.uuid(),
        seats: z.number().int().min(1).max(10_000),
        ownerEmail: z.email().optional(),
        recipientEmail: z.email().optional(),
        customerName: z.string().min(1).max(120).optional(),
        channel: z.enum(CHANNELS).default('staff'),
        amount: z.number().int().min(0).default(0).describe('Montant payé en FCFA entiers'),
        reason: z.string().max(300).optional(),
        reference: z.string().max(80).optional(),
        startsOnActivation: z.boolean().default(false),
        sendKey: z.boolean().default(false).describe('Envoyer la clé par courriel au destinataire'),
        idempotencyKey: z.string().min(8).max(80).optional(),
      }),
      annotations: WRITE,
    },
    async ({ ownerEmail, sendKey, ...values }) =>
      guarded('issue_license', { scope: 'admin:licenses', action: 'write' }, async () => {
        const organizationId = ownerEmail ? await organizationForEmail(db, ownerEmail) : null;
        if (ownerEmail && !organizationId)
          return refuse('ACCOUNT_NOT_FOUND : utilisez recipientEmail pour une personne sans compte.');
        const { license, key, replayed } = await issueLicense({ db, secret }, actor, {
          ...values,
          organizationId,
          recipientEmail: values.recipientEmail ?? ownerEmail ?? null,
        });
        if (sendKey && license.recipientEmail && !replayed) await resendLicenseKey(db, { licenseId: license.id });
        return text({
          ok: true,
          replayed,
          licenseId: license.id,
          key,
          startsAt: license.startsAt?.toISOString() ?? null,
          expiresAt: license.expiresAt?.toISOString() ?? null,
        });
      }),
  );

  server.registerTool(
    'generate_license_batch',
    {
      title: 'Générer un lot de licences',
      description:
        'Génère des licences DISTINCTES en une fois : `mode` emails (une par courriel, chacune reçoit sa clé), organization (`count` licences pour `organizationId`), keys (`count` clés sans titulaire). `label` et `reason` obligatoires (statistiques : canal « lot »). `idempotencyKey` obligatoire : rejouer rend le même lot. 500 licences au plus. Action à impact : `confirm` doit valoir true.',
      inputSchema: z.object({
        licenseTypeId: z.uuid(),
        mode: z.enum(['emails', 'organization', 'keys']),
        emails: z.array(z.email()).max(500).optional(),
        organizationId: z.string().optional(),
        count: z.number().int().min(1).max(500).optional(),
        seats: z.number().int().min(1).max(10_000),
        label: z.string().min(3).max(120),
        reason: z.string().min(3).max(300),
        customerName: z.string().min(1).max(120).optional(),
        startsOnActivation: z.boolean().default(true),
        idempotencyKey: z.string().min(8).max(80),
        confirm: z.literal(true).describe('Confirmation explicite'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ confirm: _confirm, ...input }) =>
      guarded('generate_license_batch', { scope: 'admin:licenses', action: 'write' }, async () => {
        const { batch, keys, replayed } = await generateBatch({ db, secret }, actor, BatchInput.parse(input));
        return text({ ok: true, replayed, batchId: batch.id, count: keys.length, keys });
      }),
  );

  server.registerTool(
    'find_batches',
    {
      title: 'Lots de licences',
      description: 'Liste les lots (activation, courriels en échec) ; avec `batchId`, rend le lot et ses licences.',
      inputSchema: z.object({ batchId: z.uuid().optional() }),
      annotations: READ_ONLY,
    },
    async ({ batchId }) =>
      guarded('find_batches', { scope: 'admin:read', action: 'read' }, async () =>
        text(
          batchId ? ((await getBatch({ db, secret }, batchId)) ?? { error: 'BATCH_NOT_FOUND' }) : await listBatches(db),
        ),
      ),
  );

  server.registerTool(
    'license_stats',
    {
      title: 'Statistiques des licences',
      description:
        'Tableau de bord : vendu (FCFA, sur les montants figés), offert, essais et conversions, ordinateurs actifs, série hebdomadaire par canal, à traiter. `period` : 30j, 90j ou 365j.',
      inputSchema: z.object({ period: z.enum(Object.keys(PERIODS) as [Period, ...Period[]]).default('30j') }),
      annotations: READ_ONLY,
    },
    async ({ period }) =>
      guarded('license_stats', { scope: 'admin:read', action: 'read', resource: 'stats' }, async () =>
        text(await dashboardStats(db, { period })),
      ),
  );

  server.registerTool(
    'extend_license',
    {
      title: 'Prolonger une licence',
      description:
        'Nouvelle date de fin (`expiresAt`, ISO 8601) ou `days` de plus ; une licence pas encore démarrée gagne des jours. Le logiciel le reçoit à son prochain rafraîchissement.',
      inputSchema: z.object({
        licenseId,
        expiresAt: z.iso.datetime().optional(),
        days: z.number().int().min(1).max(3650).optional(),
        reason: z.string().max(300).optional(),
      }),
      annotations: { ...WRITE, idempotentHint: true },
    },
    async ({ licenseId: id, expiresAt, days, reason }) =>
      guarded('extend_license', { scope: 'admin:licenses', action: 'write' }, async () => {
        if (!expiresAt && !days) return refuse('Indiquez expiresAt ou days.');
        await extendLicense(db, actor, {
          licenseId: id,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          days,
          reason,
        });
        return text({ ok: true, licenseId: id });
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
      inputSchema: z.object({ licenseId, activationId: z.uuid() }),
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
      inputSchema: z.object({
        licenseId,
        reason: z.string().min(3).max(300),
        confirm: z.literal(true).describe('Confirmation explicite'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ licenseId: id, reason }) =>
      guarded('revoke_license', { scope: 'admin:licenses', action: 'revoke' }, async () => {
        await revokeLicense(db, actor, { licenseId: id, reason });
        return text({ ok: true, licenseId: id, status: 'revoked' });
      }),
  );
}
