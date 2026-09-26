import { staffCan, type Resource } from '@kya-em/auth';
import type { Database } from '@kya-em/db';
import {
  BLOCKS,
  CatalogChange,
  CatalogError,
  changeCatalog,
  discardCatalogDraft,
  findPageId,
  getCatalogEditing,
  getPageForEditing,
  listMedia,
  listPages,
  listProducts,
  PageError,
  publishCatalog,
  publishDraft,
  recordAuditEvent,
  saveDraft,
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
      if (error instanceof CatalogError) {
        return refuse(
          `${error.code} ${error.issues.map((issue) => `${issue.path} : ${issue.message}`).join(' ; ')}`.trim(),
        );
      }
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
        'Offre d’un logiciel : `live` (publiée : ce que voient le site, l’API et KYA-SolDesign) et `document` (brouillon s’il existe, sinon l’offre publiée), avec `revision` du brouillon et la liste `changes` de ce qui changerait à la publication. Éditions : fonctions incluses, limites, profil du logiciel (softwareEdition), caractéristiques affichées, visible, en vente, archivée ; types de licence : nom, nature, jours, prix par poste en FCFA, postes, visible, en vente.',
      inputSchema: z.object({ product: slug }),
      annotations: READ_ONLY,
    },
    async ({ product }) => guarded('get_product', read, async () => text(await getCatalogEditing(db, product))),
  );

  server.registerTool(
    'change_catalog',
    {
      title: 'Modifier le brouillon du catalogue',
      description:
        'Applique des changements au BROUILLON de l’offre (rien n’est public avant publish_catalog). Opérations : ' +
        '`product` {fields: name, status available|soon|hidden, kind, summary, trialLicenseTypeId (type de nature trial remis par « Activer mon essai », null : pas d’essai)} ; ' +
        '`edition` {code, fields} modifie une édition ou la crée (masquée, hors vente) — champs : name, audience, softwareEdition (code connu du logiciel), watermark (null : aucun), graceDays, maxSeats, maxProjects (null : sans limite), highlights (textes affichés), visible, forSale, archived, features (liste complète des clés) ; ' +
        '`move_edition` {code, to} ; ' +
        '`license_type` {edition, id?, fields} modifie un type ou le crée sans id (masqué, hors vente) — champs : name, nature sale|trial|free|education|partner, days, pricePerSeat (FCFA entiers), indicative, seatsMin, seatsMax (null : maximum de l’édition), renewable, visible, forSale, archived ; ' +
        '`move_license_type` {edition, id, to} ; `remove` {edition, id?} retire un élément jamais publié. ' +
        '`expectedRevision` : révision lue par get_product (refus si le brouillon a changé ; null s’il n’y en avait pas).',
      inputSchema: z.object({
        product: slug,
        changes: z.array(CatalogChange).min(1).max(50),
        expectedRevision: z.number().int().min(1).nullable().optional(),
      }),
      annotations: { ...WRITE, idempotentHint: false },
    },
    async ({ product, changes, expectedRevision }) =>
      guarded('change_catalog', { scope: 'admin:catalog', resource: 'catalog', action: 'write' }, async () => {
        const result = await changeCatalog(db, actor, product, { changes, expectedRevision });
        return text({ ok: true, revision: result.revision, pendingChanges: result.changes });
      }),
  );

  server.registerTool(
    'publish_catalog',
    {
      title: 'Publier le catalogue',
      description:
        'Publie le brouillon de l’offre d’un logiciel : le site, l’API publique et les jetons de KYA-SolDesign (au prochain rafraîchissement) prennent la nouvelle offre. Les licences déjà émises gardent leurs conditions. `revision` : révision relue par get_product. Action à impact : `confirm` doit valoir true.',
      inputSchema: z.object({
        product: slug,
        revision: z.number().int().min(1),
        confirm: z.literal(true).describe('Confirmation explicite'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    },
    async ({ product, revision }) =>
      guarded('publish_catalog', { scope: 'admin:catalog', resource: 'catalog', action: 'write' }, async () => {
        const result = await publishCatalog(db, actor, product, { expectedRevision: revision });
        return text({ ok: true, version: result.version, changes: result.changes });
      }),
  );

  server.registerTool(
    'discard_catalog_draft',
    {
      title: 'Abandonner le brouillon du catalogue',
      description:
        'Supprime le brouillon de l’offre d’un logiciel ; l’offre publiée ne change pas. `confirm` doit valoir true.',
      inputSchema: z.object({ product: slug, confirm: z.literal(true).describe('Confirmation explicite') }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ product }) =>
      guarded('discard_catalog_draft', { scope: 'admin:catalog', resource: 'catalog', action: 'write' }, async () =>
        text({ ok: true, discarded: await discardCatalogDraft(db, actor, product) }),
      ),
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
