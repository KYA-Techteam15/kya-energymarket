import { staffCan, type Resource } from '@kya-em/auth';
import type { Database } from '@kya-em/db';
import {
  BLOCKS,
  CatalogError,
  DURATIONS,
  findPageId,
  getCatalogProduct,
  getPageForEditing,
  listMedia,
  listPages,
  listProducts,
  PageError,
  publishDraft,
  recordAuditEvent,
  saveDraft,
  setPlan,
  upsertEdition,
  upsertProduct,
  type Logger,
} from '@kya-em/domain';
import type { McpServer } from '@modelcontextprotocol/server';
import { z, ZodError } from 'zod';
import type { McpCaller } from './tools.server';

/**
 * Outils MCP du catalogue et des pages (spec 004, histoire 5). Mêmes services et mêmes droits que
 * l'administration : la portée accordée au client ET le rôle d'équipe de la personne sont vérifiés.
 */
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] });
const refuse = (message: string) => ({ content: [{ type: 'text' as const, text: message }], isError: true });

const localized = z.object({ fr: z.string().min(1).max(400), en: z.string().max(400).optional() });
const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/u)
  .describe('Identifiant du logiciel, par exemple kya-soldesign');
const locale = z.enum(['fr', 'en']).describe('Langue de la page');
const pageRef = {
  product: slug.nullable().describe('Logiciel de la page ; null pour une page de la marketplace'),
  key: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/u)
    .describe('Clé de la page : presentation, tarifs, ressources, support, aide…'),
};

export function registerContentTools(server: McpServer, context: { db: Database; logger: Logger; caller: McpCaller }) {
  const { db, logger, caller } = context;
  const role = caller.staff.roles.join(',');
  const actor = { type: 'mcp_client' as const, id: caller.staff.id };

  /** Garde commune : portée du client, droit d'équipe, audit, erreurs métier en message lisible. */
  const guarded = async (
    tool: string,
    need: { scope: string; resource: Resource; action: string },
    run: () => Promise<ReturnType<typeof text>>,
  ) => {
    if (!caller.scopes.includes(need.scope)) {
      return refuse(`Portée « ${need.scope} » non accordée à ce client : reconnectez-le pour l'autoriser.`);
    }
    if (!staffCan(role, need.resource, need.action)) {
      return refuse(`Votre rôle d'équipe ne permet pas « ${need.resource}:${need.action} ».`);
    }
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
      if (error instanceof ZodError) {
        return refuse(
          `Entrée refusée : ${error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join(' ; ')}`,
        );
      }
      if (error instanceof PageError) {
        const issues = (error as PageError & { issues?: { path: PropertyKey[]; message: string }[] }).issues ?? [];
        return refuse(
          `${error.code} ${issues.map((issue) => `${issue.path.map(String).join('.')} : ${issue.message}`).join(' ; ')}`,
        );
      }
      if (error instanceof CatalogError) return refuse(error.code);
      throw error;
    }
  };

  const read = { scope: 'admin:read', resource: 'catalog' as Resource, action: 'read' };
  const readContent = { scope: 'admin:read', resource: 'content' as Resource, action: 'read' };

  server.registerTool(
    'search_catalog',
    {
      title: 'Catalogue',
      description: 'Liste les logiciels du catalogue (y compris masqués) : identifiant, nom, état, nature.',
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async () => guarded('search_catalog', read, async () => text(await listProducts(db, { includeHidden: true }))),
  );

  server.registerTool(
    'get_product',
    {
      title: 'Offre d’un logiciel',
      description:
        'Offre complète d’un logiciel : fonctions (clés), éditions (fonctions incluses, filigrane, délai de grâce, postes et projets maximum) et durées (prix par poste en FCFA, prix exemple ou définitif, actives ou non).',
      inputSchema: z.object({ product: slug }),
      annotations: READ_ONLY,
    },
    async ({ product }) =>
      guarded('get_product', read, async () =>
        text((await getCatalogProduct(db, product)) ?? { error: 'PRODUCT_NOT_FOUND' }),
      ),
  );

  server.registerTool(
    'update_product',
    {
      title: 'Modifier un logiciel',
      description:
        'Modifie la fiche d’un logiciel (nom, état available/soon/hidden, nature, résumé, logo, monogramme). Seuls les champs fournis changent. Tracé dans l’audit.',
      inputSchema: z.object({
        product: slug,
        name: z.string().min(2).max(60).optional(),
        status: z.enum(['available', 'soon', 'hidden']).optional(),
        kind: localized.optional(),
        summary: localized.optional(),
      }),
      annotations: WRITE,
    },
    async ({ product, ...values }) =>
      guarded('update_product', { scope: 'admin:catalog', resource: 'catalog', action: 'write' }, async () => {
        const row = await upsertProduct(db, actor, product, values);
        return text({ ok: true, product: row.slug, status: row.status });
      }),
  );

  server.registerTool(
    'update_edition',
    {
      title: 'Modifier une édition',
      description:
        'Modifie une édition (ou la crée) : nom, public, filigrane (null : aucun), délai de grâce en jours, postes et projets maximum (null : sans limite), active, et la liste complète des clés de fonctions incluses.',
      inputSchema: z.object({
        product: slug,
        edition: z
          .string()
          .regex(/^[a-z][a-z0-9_]{1,30}$/u)
          .describe('Code de l’édition : commercial, academic, student…'),
        name: localized.optional(),
        audience: localized.optional(),
        watermark: localized.nullable().optional(),
        graceDays: z.number().int().min(0).max(90).optional(),
        maxSeats: z.number().int().min(1).nullable().optional(),
        maxProjects: z.number().int().min(1).nullable().optional(),
        active: z.boolean().optional(),
        features: z.array(z.string()).optional().describe('Clés des fonctions incluses (remplace la liste)'),
      }),
      annotations: WRITE,
    },
    async ({ product, edition, ...values }) =>
      guarded('update_edition', { scope: 'admin:catalog', resource: 'catalog', action: 'write' }, async () => {
        await upsertEdition(db, actor, product, edition, values);
        return text({ ok: true, product, edition });
      }),
  );

  server.registerTool(
    'set_plan_price',
    {
      title: 'Prix d’une durée',
      description:
        'Fixe le prix par poste (FCFA entiers) d’une durée d’une édition, la crée si besoin. Durées : P1D, P1W, P1M, P3M, P6M, P1Y. `indicative: false` retire la mention « prix exemple ».',
      inputSchema: z.object({
        product: slug,
        edition: z.string(),
        duration: z.enum(DURATIONS),
        pricePerSeat: z.number().int().min(0),
        indicative: z.boolean().optional(),
        active: z.boolean().optional(),
      }),
      annotations: WRITE,
    },
    async ({ product, edition, duration, ...values }) =>
      guarded('set_plan_price', { scope: 'admin:catalog', resource: 'catalog', action: 'write' }, async () => {
        const plan = await setPlan(db, actor, product, edition, duration, values);
        return text({
          ok: true,
          duration: plan.duration,
          pricePerSeat: plan.pricePerSeat,
          indicative: plan.indicative,
        });
      }),
  );

  server.registerTool(
    'list_pages',
    {
      title: 'Pages',
      description: 'Liste les pages composées et leur état par langue (version publiée, brouillon en cours).',
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async () => guarded('list_pages', readContent, async () => text(await listPages(db))),
  );

  server.registerTool(
    'get_page',
    {
      title: 'Lire une page',
      description:
        'Rend une page dans une langue : brouillon, version publiée, historique, et la description des types de blocs utilisés (champs attendus) pour écrire un brouillon valide.',
      inputSchema: z.object({ ...pageRef, locale }),
      annotations: READ_ONLY,
    },
    async ({ product, key, locale: language }) =>
      guarded('get_page', readContent, async () => {
        const pageId = await findPageId(db, { productSlug: product, key });
        if (!pageId) return text({ error: 'PAGE_NOT_FOUND' });
        const editing = await getPageForEditing(db, pageId, language);
        const content = editing?.draft ?? editing?.published;
        const used = new Set(content?.blocks.map((block) => block.type) ?? []);
        return text({
          ...editing,
          blockTypes: BLOCKS.filter((block) => used.has(block.type)),
          otherBlockTypes: BLOCKS.filter((block) => !used.has(block.type)).map((block) => ({
            type: block.type,
            label: block.label,
            description: block.description,
          })),
          media: (await listMedia(db)).map((item) => ({ ref: item.ref, alt: item.alt })),
        });
      }),
  );

  server.registerTool(
    'update_page_draft',
    {
      title: 'Écrire le brouillon d’une page',
      description:
        'Remplace le brouillon d’une page dans une langue (titre, description, liste complète des blocs {id, type, data}). Chaque bloc est validé par le schéma de son type ; rien n’est public avant publish_page.',
      inputSchema: z.object({
        ...pageRef,
        locale,
        title: z.string().min(1).max(140),
        description: z.string().max(300).optional(),
        blocks: z.array(
          z.object({ id: z.string().min(1).max(64), type: z.string(), data: z.record(z.string(), z.unknown()) }),
        ),
      }),
      annotations: WRITE,
    },
    async ({ product, key, locale: language, title, description, blocks }) =>
      guarded('update_page_draft', { scope: 'admin:content', resource: 'content', action: 'write' }, async () => {
        const pageId = await findPageId(db, { productSlug: product, key });
        if (!pageId) return text({ error: 'PAGE_NOT_FOUND' });
        const draft = await saveDraft(db, actor, { pageId, locale: language, title, description, blocks });
        return text({ ok: true, draftVersion: draft.version, blocks: draft.blocks.length });
      }),
  );

  server.registerTool(
    'publish_page',
    {
      title: 'Publier une page',
      description:
        'Publie le brouillon d’une page dans une langue ; la version précédente est archivée et reste restaurable. `draftVersion` : numéro du brouillon relu (refus s’il a changé depuis).',
      inputSchema: z.object({ ...pageRef, locale, draftVersion: z.number().int().min(1) }),
      annotations: { ...WRITE, idempotentHint: false },
    },
    async ({ product, key, locale: language, draftVersion }) =>
      guarded('publish_page', { scope: 'admin:content', resource: 'content', action: 'publish' }, async () => {
        const pageId = await findPageId(db, { productSlug: product, key });
        if (!pageId) return text({ error: 'PAGE_NOT_FOUND' });
        const published = await publishDraft(db, actor, { pageId, locale: language, expectedVersion: draftVersion });
        return text({ ok: true, publishedVersion: published.version });
      }),
  );
}
