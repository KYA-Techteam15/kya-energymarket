import {
  changeCatalog,
  discardCatalogDraft,
  getCatalogEditing,
  CatalogError,
  licenseCountsByType,
  listProducts,
  publishCatalog,
} from '@kya-em/domain';
import { attempt, consoleStaff, FORBIDDEN } from '../console/access.server';

/** Catalogue dans la console (spec 005b, histoire 1) : tout passe par le brouillon. */
export async function loadProducts() {
  const current = await consoleStaff('catalog', 'read');
  if (!current) return null;
  const products = await listProducts(current.db, { includeHidden: true });
  const withOffer = await Promise.all(
    products.map(async (summary) => {
      const editing = await getCatalogEditing(current.db, summary.slug);
      return {
        ...summary,
        editions: editing.live.editions.filter((edition) => !edition.archived).length,
        pending: editing.changes.length,
      };
    }),
  );
  return { products: withOffer, canWrite: current.can('catalog', 'write') };
}

export async function loadEditing(slug: string) {
  const current = await consoleStaff('catalog', 'read');
  if (!current) return null;
  const editing = await getCatalogEditing(current.db, slug).catch((error: unknown) => {
    if (error instanceof CatalogError && error.code === 'PRODUCT_NOT_FOUND') return null;
    throw error;
  });
  if (!editing) return null;
  const issued = await licenseCountsByType(
    current.db,
    editing.live.editions.flatMap((edition) => edition.types.map((type) => type.id)),
  );
  return { ...editing, issued, canWrite: current.can('catalog', 'write') };
}

export async function changeFromConsole(input: { slug: string; changes: unknown[]; expectedRevision: number | null }) {
  const current = await consoleStaff('catalog', 'write');
  if (!current) return FORBIDDEN;
  return attempt(async () => {
    const { revision, changes } = await changeCatalog(current.db, current.actor, input.slug, {
      changes: input.changes,
      expectedRevision: input.expectedRevision,
    });
    return { revision, pending: changes.length };
  });
}

export async function publishFromConsole(input: { slug: string; revision: number }) {
  const current = await consoleStaff('catalog', 'write');
  if (!current) return FORBIDDEN;
  return attempt(async () => {
    const { version, changes } = await publishCatalog(current.db, current.actor, input.slug, {
      expectedRevision: input.revision,
    });
    return { version, changes: changes.length };
  });
}

export async function discardFromConsole(slug: string) {
  const current = await consoleStaff('catalog', 'write');
  if (!current) return FORBIDDEN;
  return attempt(() => discardCatalogDraft(current.db, current.actor, slug).then(() => null));
}
