import { staffCan, type Resource } from '@kya-em/auth';
import {
  BLOCKS,
  getPageForEditing,
  listMedia,
  listPages,
  MediaError,
  PageError,
  publishDraft,
  restoreVersion,
  saveDraft,
  updateMediaTexts,
  uploadImage,
  type Actor,
  type Locale,
} from '@kya-em/domain';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { ZodError } from 'zod';
import { runtime } from '@/shared/server/runtime.server';

/**
 * Administration des pages et des médias (spec 004, FR-007) ; le catalogue passe par son brouillon (005b). Chaque fonction repart de
 * la session et vérifie le droit d'équipe côté serveur ; l'interface ne fait que refléter ces droits.
 */
export type AdminResult<T = null> =
  { ok: true; value: T } | { ok: false; code: string; issues?: { path: string; message: string }[] };

async function staff(resource: Resource, action: string) {
  const { auth, database, media } = runtime();
  if (!auth || !database) return null;
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  const role = (session?.user as { role?: string | null } | undefined)?.role ?? null;
  if (!session || !staffCan(role, resource, action)) return null;
  const actor: Actor = { type: 'kya_staff', id: session.user.id };
  return { db: database.db, media, actor, role };
}

/** Exécute une écriture et traduit les erreurs métier en résultat lisible par l'interface. */
async function write<T>(run: () => Promise<T>): Promise<AdminResult<T>> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        code: 'INVALID',
        issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      };
    }
    if (error instanceof PageError) {
      const issues = (error as PageError & { issues?: { path: PropertyKey[]; message: string }[] }).issues;
      return {
        ok: false,
        code: error.code,
        issues: issues?.map((issue) => ({ path: issue.path.map(String).join('.'), message: issue.message })),
      };
    }
    if (error instanceof MediaError) return { ok: false, code: error.code };
    throw error;
  }
}

const FORBIDDEN = { ok: false as const, code: 'FORBIDDEN' };

/** Valeur JSON : ce que les fonctions serveur transmettent au navigateur. */
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
interface EditorContent {
  readonly pageId: string;
  readonly locale: Locale;
  readonly version: number;
  readonly status: 'draft' | 'published' | 'archived';
  readonly title: string;
  readonly description: string;
  readonly blocks: { id: string; type: string; data: { [key: string]: Json } }[];
  readonly publishedAt: string | null;
  readonly updatedAt: string;
}

// ---------------------------------------------------------------- pages

export async function loadPagesAdmin() {
  const current = await staff('content', 'read');
  if (!current) return null;
  return { pages: await listPages(current.db) };
}

export async function loadPageEditor(pageId: string, locale: Locale) {
  const current = await staff('content', 'read');
  if (!current) return null;
  const editing = await getPageForEditing(current.db, pageId, locale);
  if (!editing) return null;
  return {
    ...editing,
    draft: editing.draft as unknown as EditorContent | null,
    published: editing.published as unknown as EditorContent | null,
    locale,
    // Description des blocs (champs, libellés) : de simples données, pour construire le formulaire.
    definitions: BLOCKS,
    media: await listMedia(current.db),
    canWrite: staffCan(current.role, 'content', 'write'),
    canPublish: staffCan(current.role, 'content', 'publish'),
  };
}

export async function saveDraftAdmin(input: {
  pageId: string;
  locale: Locale;
  title: string;
  description: string;
  blocks: unknown;
}) {
  const current = await staff('content', 'write');
  if (!current) return FORBIDDEN;
  return write(async () => (await saveDraft(current.db, current.actor, input)).version);
}

export async function publishAdmin(input: { pageId: string; locale: Locale; expectedVersion: number }) {
  const current = await staff('content', 'publish');
  if (!current) return FORBIDDEN;
  return write(async () => (await publishDraft(current.db, current.actor, input)).version);
}

export async function restoreAdmin(input: { pageId: string; locale: Locale; version: number }) {
  const current = await staff('content', 'write');
  if (!current) return FORBIDDEN;
  return write(async () => (await restoreVersion(current.db, current.actor, input)).version);
}

// ---------------------------------------------------------------- médias

export async function loadMediaAdmin() {
  const current = await staff('content', 'read');
  if (!current) return null;
  return { media: await listMedia(current.db), canWrite: staffCan(current.role, 'content', 'write') };
}

export async function uploadMediaAdmin(form: FormData) {
  const current = await staff('content', 'write');
  if (!current) return FORBIDDEN;
  const file = form.get('file');
  if (!(file instanceof File)) return { ok: false as const, code: 'NOT_AN_IMAGE' };
  const creditFr = String(form.get('creditFr') ?? '').trim();
  return write(async () => {
    const row = await uploadImage(current.db, current.media, current.actor, {
      bytes: new Uint8Array(await file.arrayBuffer()),
      alt: { fr: String(form.get('altFr') ?? ''), en: String(form.get('altEn') ?? '') || undefined },
      credit: creditFr ? { fr: creditFr, en: String(form.get('creditEn') ?? '') || undefined } : null,
    });
    return row.id;
  });
}

export async function saveMediaTexts(id: string, input: unknown) {
  const current = await staff('content', 'write');
  if (!current) return FORBIDDEN;
  return write(async () => {
    await updateMediaTexts(current.db, current.actor, id, input as never);
    return null;
  });
}
