import type { CatalogChange } from '@kya-em/domain';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { changeFromConsole, discardFromConsole, loadEditing, loadProducts, publishFromConsole } from './catalog.server';

// Fonctions serveur du catalogue ; les changements sont validés par le schéma du domaine.
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/u);

export const getProducts = createServerFn({ method: 'GET' }).handler(() => loadProducts());

export const getEditing = createServerFn({ method: 'GET' })
  .validator((input: { slug: string }) => ({ slug: slug.parse(input.slug) }))
  .handler(({ data }) => loadEditing(data.slug));

const ChangeRequest = z.strictObject({
  slug,
  // Chaque changement est validé par `changeCatalog` (schéma CatalogChange du domaine), côté serveur.
  changes: z
    .array(z.custom<CatalogChange>((value) => typeof value === 'object' && value !== null))
    .min(1)
    .max(100),
  expectedRevision: z.number().int().min(1).nullable(),
});
export const changeCatalogFn = createServerFn({ method: 'POST' })
  .validator((input: z.input<typeof ChangeRequest>) => ChangeRequest.parse(input))
  .handler(({ data }) => changeFromConsole(data));

export const publishCatalogFn = createServerFn({ method: 'POST' })
  .validator((input: { slug: string; revision: number }) =>
    z.strictObject({ slug, revision: z.number().int().min(1) }).parse(input),
  )
  .handler(({ data }) => publishFromConsole(data));

export const discardCatalogFn = createServerFn({ method: 'POST' })
  .validator((input: { slug: string }) => ({ slug: slug.parse(input.slug) }))
  .handler(({ data }) => discardFromConsole(data.slug));
