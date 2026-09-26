import { createServerFn } from '@tanstack/react-start';
import {
  loadMediaAdmin,
  loadPageEditor,
  loadPagesAdmin,
  publishAdmin,
  restoreAdmin,
  saveDraftAdmin,
  saveMediaTexts,
  uploadMediaAdmin,
} from './content.server';

// Fonctions serveur de l'administration des pages et des médias (spec 004). Les entrées
// sont validées ici dans leur forme, puis par les schémas du domaine ; les droits dans content.server.ts.
const str = (value: unknown, max = 200) => {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) throw new Error('valeur invalide');
  return value;
};
const locale = (value: unknown) => (value === 'en' ? ('en' as const) : ('fr' as const));
const record = (input: unknown) => (input ?? {}) as Record<string, unknown>;

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
