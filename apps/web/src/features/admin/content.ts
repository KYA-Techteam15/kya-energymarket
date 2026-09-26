import { createServerFn } from '@tanstack/react-start';
import {
  loadCatalogAdmin,
  loadMediaAdmin,
  loadPageEditor,
  loadPagesAdmin,
  loadProductAdmin,
  publishAdmin,
  restoreAdmin,
  saveDraftAdmin,
  saveEdition,
  saveFeature,
  saveMediaTexts,
  savePlan,
  saveProduct,
  uploadMediaAdmin,
} from './content.server';

// Fonctions serveur de l'administration du catalogue, des pages et des médias (spec 004). Les entrées
// sont validées ici dans leur forme, puis par les schémas du domaine ; les droits dans content.server.ts.
const str = (value: unknown, max = 200) => {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) throw new Error('valeur invalide');
  return value;
};
const slug = (value: unknown) => {
  const text = str(value, 60);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/u.test(text)) throw new Error('identifiant invalide');
  return text;
};
const locale = (value: unknown) => (value === 'en' ? ('en' as const) : ('fr' as const));
const record = (input: unknown) => (input ?? {}) as Record<string, unknown>;

export const getCatalogAdmin = createServerFn({ method: 'GET' }).handler(() => loadCatalogAdmin());

export const getProductAdmin = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ({ slug: slug(record(input).slug) }))
  .handler(({ data }) => loadProductAdmin(data.slug));

export const updateProduct = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({ slug: slug(record(input).slug), values: record(input).values }))
  .handler(({ data }) => saveProduct(data.slug, data.values));

export const updateFeature = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    slug: slug(record(input).slug),
    key: str(record(input).key, 60),
    values: record(input).values,
  }))
  .handler(({ data }) => saveFeature(data.slug, data.key, data.values));

export const updateEdition = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    slug: slug(record(input).slug),
    code: str(record(input).code, 30),
    values: record(input).values,
  }))
  .handler(({ data }) => saveEdition(data.slug, data.code, data.values));

export const updatePlan = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({
    slug: slug(record(input).slug),
    code: str(record(input).code, 30),
    duration: str(record(input).duration, 5),
    values: record(input).values,
  }))
  .handler(({ data }) => savePlan(data.slug, data.code, data.duration, data.values));

export const getPagesAdmin = createServerFn({ method: 'GET' }).handler(() => loadPagesAdmin());

export const getPageEditor = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ({ id: str(record(input).id, 40), locale: locale(record(input).locale) }))
  .handler(({ data }) => loadPageEditor(data.id, data.locale));

export const saveDraftFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const value = record(input);
    return {
      pageId: str(value.pageId, 40),
      locale: locale(value.locale),
      title: typeof value.title === 'string' ? value.title : '',
      description: typeof value.description === 'string' ? value.description : '',
      blocks: value.blocks,
    };
  })
  .handler(({ data }) => saveDraftAdmin(data));

export const publishFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const value = record(input);
    return {
      pageId: str(value.pageId, 40),
      locale: locale(value.locale),
      expectedVersion: Number(value.expectedVersion),
    };
  })
  .handler(({ data }) => publishAdmin(data));

export const restoreFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const value = record(input);
    return { pageId: str(value.pageId, 40), locale: locale(value.locale), version: Number(value.version) };
  })
  .handler(({ data }) => restoreAdmin(data));

export const getMediaAdmin = createServerFn({ method: 'GET' }).handler(() => loadMediaAdmin());

export const uploadMediaFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    if (!(input instanceof FormData)) throw new Error('formulaire attendu');
    return input;
  })
  .handler(({ data }) => uploadMediaAdmin(data));

export const updateMediaFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ({ id: str(record(input).id, 40), values: record(input).values }))
  .handler(({ data }) => saveMediaTexts(data.id, data.values));
