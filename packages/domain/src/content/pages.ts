import { randomUUID } from 'node:crypto';
import { pages, pageVersions, products, type Database, type PageVersionRow, type StoredBlock } from '@kya-em/db';
import { and, asc, desc, eq, isNull, max } from 'drizzle-orm';
import { z } from 'zod';
import { recordAuditEvent } from '../audit/recordAuditEvent.ts';
import type { Actor, Locale } from '../catalog/catalog.ts';
import { blocksSchema } from './blocks.ts';

/**
 * Pages composées (spec 004, FR-002). Une page a, par langue, au plus un brouillon et au plus une
 * version publiée ; publier fige le brouillon et archive la version précédente. Le public ne voit
 * jamais un brouillon.
 */
export const PAGE_KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/u;

export class PageError extends Error {
  constructor(readonly code: 'PAGE_NOT_FOUND' | 'NO_DRAFT' | 'STALE_DRAFT' | 'VERSION_NOT_FOUND' | 'INVALID_BLOCKS') {
    super(code);
  }
}

export interface PageRef {
  /** `null` : page de la marketplace. */
  readonly productSlug: string | null;
  readonly key: string;
}

export interface PageContent {
  readonly pageId: string;
  readonly locale: Locale;
  readonly version: number;
  readonly status: PageVersionRow['status'];
  readonly title: string;
  readonly description: string;
  readonly blocks: StoredBlock[];
  readonly publishedAt: string | null;
  readonly updatedAt: string;
}

const toContent = (row: PageVersionRow): PageContent => ({
  pageId: row.pageId,
  locale: row.locale,
  version: row.version,
  status: row.status,
  title: row.title,
  description: row.description,
  blocks: row.blocks,
  publishedAt: row.publishedAt?.toISOString() ?? null,
  updatedAt: row.updatedAt.toISOString(),
});

async function productIdOf(db: Database, slug: string | null) {
  if (slug === null) return null;
  const [row] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
  if (!row) throw new PageError('PAGE_NOT_FOUND');
  return row.id;
}

export async function findPageId(db: Database, ref: PageRef): Promise<string | null> {
  const productId = await productIdOf(db, ref.productSlug).catch(() => undefined);
  if (productId === undefined) return null;
  const [row] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(productId === null ? isNull(pages.productId) : eq(pages.productId, productId), eq(pages.key, ref.key)))
    .limit(1);
  return row?.id ?? null;
}

/** Crée la page si elle n'existe pas (amorçage, administration) et rend son identifiant. */
export async function ensurePage(db: Database, ref: PageRef): Promise<string> {
  z.string().regex(PAGE_KEY).parse(ref.key);
  const existing = await findPageId(db, ref);
  if (existing) return existing;
  const productId = await productIdOf(db, ref.productSlug);
  const [created] = await db.insert(pages).values({ productId, key: ref.key }).onConflictDoNothing().returning();
  return created?.id ?? (await findPageId(db, ref))!;
}

async function versionOf(db: Database, pageId: string, locale: Locale, status: 'draft' | 'published') {
  const [row] = await db
    .select()
    .from(pageVersions)
    .where(and(eq(pageVersions.pageId, pageId), eq(pageVersions.locale, locale), eq(pageVersions.status, status)))
    .limit(1);
  return row ?? null;
}

/**
 * Version publiée pour le public. Sans version dans la langue demandée, la version française sert de
 * repli (`fallback: true`), annoncée comme telle.
 */
export async function getPublishedPage(db: Database, ref: PageRef, locale: Locale) {
  const pageId = await findPageId(db, ref);
  if (!pageId) return null;
  const own = await versionOf(db, pageId, locale, 'published');
  if (own) return { content: toContent(own), fallback: false };
  if (locale === 'fr') return null;
  const french = await versionOf(db, pageId, 'fr', 'published');
  return french ? { content: toContent(french), fallback: true } : null;
}

/** Aperçu de l'équipe : le brouillon s'il existe, sinon la version publiée. */
export async function getPreviewPage(db: Database, ref: PageRef, locale: Locale) {
  const pageId = await findPageId(db, ref);
  if (!pageId) return null;
  const row = (await versionOf(db, pageId, locale, 'draft')) ?? (await versionOf(db, pageId, locale, 'published'));
  return row ? { content: toContent(row), fallback: false } : getPublishedPage(db, ref, locale);
}

export const DraftInput = z.strictObject({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(300).default(''),
  blocks: blocksSchema,
});

/** Enregistre le brouillon d'une langue (le crée à partir de rien si besoin). Blocs validés. */
export async function saveDraft(
  db: Database,
  actor: Actor,
  input: { pageId: string; locale: Locale; title: string; description?: string; blocks: unknown },
): Promise<PageContent> {
  const parsed = DraftInput.safeParse({
    title: input.title,
    description: input.description ?? '',
    blocks: input.blocks,
  });
  if (!parsed.success) {
    const error = new PageError('INVALID_BLOCKS');
    (error as PageError & { issues: unknown }).issues = parsed.error.issues;
    throw error;
  }
  const blocks = parsed.data.blocks.map((block) => ({ ...block, id: block.id || randomUUID() }));
  const draft = await versionOf(db, input.pageId, input.locale, 'draft');
  let row: PageVersionRow;
  if (draft) {
    [row] = (await db
      .update(pageVersions)
      .set({ title: parsed.data.title, description: parsed.data.description, blocks, updatedAt: new Date() })
      .where(eq(pageVersions.id, draft.id))
      .returning()) as [PageVersionRow];
  } else {
    const [{ last } = { last: 0 }] = await db
      .select({ last: max(pageVersions.version) })
      .from(pageVersions)
      .where(and(eq(pageVersions.pageId, input.pageId), eq(pageVersions.locale, input.locale)));
    [row] = (await db
      .insert(pageVersions)
      .values({
        pageId: input.pageId,
        locale: input.locale,
        version: (last ?? 0) + 1,
        status: 'draft',
        title: parsed.data.title,
        description: parsed.data.description,
        blocks,
        createdBy: actor.id,
      })
      .returning()) as [PageVersionRow];
  }
  await recordAuditEvent(db, {
    actorType: actor.type,
    actorId: actor.id,
    action: 'content.draft_saved',
    resourceType: 'page',
    resourceId: input.pageId,
    outcome: 'success',
    details: { locale: input.locale, version: row.version, blocks: blocks.length },
  });
  return toContent(row);
}

/**
 * Publie le brouillon. `expectedVersion` : numéro du brouillon vu par la personne ; si un autre
 * brouillon l'a remplacé entre-temps, la publication est refusée.
 */
export async function publishDraft(
  db: Database,
  actor: Actor,
  input: { pageId: string; locale: Locale; expectedVersion?: number },
): Promise<PageContent> {
  const draft = await versionOf(db, input.pageId, input.locale, 'draft');
  if (!draft) throw new PageError('NO_DRAFT');
  if (input.expectedVersion !== undefined && draft.version !== input.expectedVersion)
    throw new PageError('STALE_DRAFT');
  const now = new Date();
  const published = await db.transaction(async (tx) => {
    await tx
      .update(pageVersions)
      .set({ status: 'archived' })
      .where(
        and(
          eq(pageVersions.pageId, input.pageId),
          eq(pageVersions.locale, input.locale),
          eq(pageVersions.status, 'published'),
        ),
      );
    const [row] = await tx
      .update(pageVersions)
      .set({ status: 'published', publishedAt: now, publishedBy: actor.id, updatedAt: now })
      .where(eq(pageVersions.id, draft.id))
      .returning();
    return row!;
  });
  await recordAuditEvent(db, {
    actorType: actor.type,
    actorId: actor.id,
    action: 'content.page_published',
    resourceType: 'page',
    resourceId: input.pageId,
    outcome: 'success',
    details: { locale: input.locale, version: published.version },
  });
  return toContent(published);
}

/** Restaure une version passée comme brouillon (à relire, puis à publier). */
export async function restoreVersion(
  db: Database,
  actor: Actor,
  input: { pageId: string; locale: Locale; version: number },
): Promise<PageContent> {
  const [source] = await db
    .select()
    .from(pageVersions)
    .where(
      and(
        eq(pageVersions.pageId, input.pageId),
        eq(pageVersions.locale, input.locale),
        eq(pageVersions.version, input.version),
      ),
    )
    .limit(1);
  if (!source) throw new PageError('VERSION_NOT_FOUND');
  return saveDraft(db, actor, {
    pageId: input.pageId,
    locale: input.locale,
    title: source.title,
    description: source.description,
    blocks: source.blocks,
  });
}

/** Page à éditer dans une langue : brouillon, version publiée et historique. */
export async function getPageForEditing(db: Database, pageId: string, locale: Locale) {
  const [page] = await db
    .select({ id: pages.id, key: pages.key, productSlug: products.slug, productName: products.name })
    .from(pages)
    .leftJoin(products, eq(pages.productId, products.id))
    .where(eq(pages.id, pageId))
    .limit(1);
  if (!page) return null;
  const versions = await db
    .select()
    .from(pageVersions)
    .where(and(eq(pageVersions.pageId, pageId), eq(pageVersions.locale, locale)))
    .orderBy(desc(pageVersions.version));
  const draft = versions.find((row) => row.status === 'draft');
  const published = versions.find((row) => row.status === 'published');
  return {
    page: { id: page.id, key: page.key, productSlug: page.productSlug, productName: page.productName },
    draft: draft ? toContent(draft) : null,
    published: published ? toContent(published) : null,
    history: versions.map((row) => ({
      version: row.version,
      status: row.status,
      title: row.title,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

/** Toutes les pages, avec leur état par langue (administration, MCP). */
export async function listPages(db: Database) {
  const rows = await db
    .select({ id: pages.id, key: pages.key, productSlug: products.slug, productName: products.name })
    .from(pages)
    .leftJoin(products, eq(pages.productId, products.id))
    .orderBy(asc(products.name), asc(pages.key));
  const versions = await db
    .select({
      pageId: pageVersions.pageId,
      locale: pageVersions.locale,
      status: pageVersions.status,
      version: pageVersions.version,
      title: pageVersions.title,
    })
    .from(pageVersions);
  return rows.map((row) => {
    const state = (locale: Locale) => {
      const mine = versions.filter((version) => version.pageId === row.id && version.locale === locale);
      return {
        published: mine.find((version) => version.status === 'published')?.version ?? null,
        draft: mine.find((version) => version.status === 'draft')?.version ?? null,
        title:
          (mine.find((version) => version.status === 'draft') ?? mine.find((v) => v.status === 'published'))?.title ??
          null,
      };
    };
    return { ...row, fr: state('fr'), en: state('en') };
  });
}
