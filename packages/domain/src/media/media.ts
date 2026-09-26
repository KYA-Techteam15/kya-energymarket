import { randomUUID } from 'node:crypto';
import { media, type Database, type LocalizedText, type MediaRow } from '@kya-em/db';
import { desc, eq, inArray, or } from 'drizzle-orm';
import sharp, { type OutputInfo } from 'sharp';
import { z } from 'zod';
import { recordAuditEvent } from '../audit/recordAuditEvent.ts';
import { pick, type Actor, type Locale } from '../catalog/catalog.ts';
import type { MediaStorage } from './storage.ts';

/**
 * Médiathèque (spec 004, histoire 4). Une image téléversée est convertie en WebP (2400 px de large au
 * plus, métadonnées retirées) avant d'être rangée ; les images livrées avec l'application sont des
 * médias « statiques » désignés par leur chemin.
 */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
/** Formats lus par le serveur lui-même (sharp), sans se fier au type annoncé par le navigateur. */
const ACCEPTED = new Set(['jpeg', 'png', 'webp', 'avif', 'gif', 'heif']);

export class MediaError extends Error {
  constructor(readonly code: 'TOO_LARGE' | 'UNSUPPORTED_TYPE' | 'NOT_AN_IMAGE' | 'NOT_FOUND') {
    super(code);
  }
}

const localized = z.object({ fr: z.string().trim().min(1).max(300), en: z.string().trim().max(300).optional() });
export const MediaTextInput = z.strictObject({ alt: localized, credit: localized.nullable().optional() });

/** Adresse publique d'un média : chemin livré, ou `/media/<clé>` servi par l'application. */
export const mediaUrl = (row: Pick<MediaRow, 'path' | 'storageKey'>) =>
  row.path ?? (row.storageKey ? `/media/${row.storageKey}` : '');

export interface ResolvedMedia {
  readonly src: string;
  readonly alt: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly credit: string | null;
}

export async function uploadImage(
  db: Database,
  storage: MediaStorage,
  actor: Actor,
  input: { bytes: Uint8Array; alt: LocalizedText; credit?: LocalizedText | null },
) {
  if (input.bytes.byteLength > MAX_UPLOAD_BYTES) throw new MediaError('TOO_LARGE');
  const texts = MediaTextInput.parse({ alt: input.alt, credit: input.credit ?? null });
  let output: { data: Buffer; info: OutputInfo };
  let format: string | undefined;
  try {
    format = (await sharp(input.bytes).metadata()).format;
  } catch {
    throw new MediaError('NOT_AN_IMAGE');
  }
  if (!format || !ACCEPTED.has(format)) throw new MediaError('UNSUPPORTED_TYPE');
  try {
    output = await sharp(input.bytes, { limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: 2400, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new MediaError('NOT_AN_IMAGE');
  }
  const key = `images/${randomUUID()}.webp`;
  await storage.put(key, new Uint8Array(output.data), 'image/webp');
  const [row] = await db
    .insert(media)
    .values({
      storageKey: key,
      mime: 'image/webp',
      width: output.info.width,
      height: output.info.height,
      bytes: output.info.size,
      alt: texts.alt,
      credit: texts.credit ?? null,
      createdBy: actor.id,
    })
    .returning();
  await recordAuditEvent(db, {
    actorType: actor.type,
    actorId: actor.id,
    action: 'media.uploaded',
    resourceType: 'media',
    resourceId: row!.id,
    outcome: 'success',
    details: { bytes: output.info.size, width: output.info.width },
  });
  return row!;
}

/** Enregistre une image livrée avec l'application (amorçage), si elle ne l'est pas déjà. */
export async function registerStaticImage(
  db: Database,
  input: { path: string; alt: LocalizedText; credit?: LocalizedText | null; width?: number; height?: number },
) {
  const mime = input.path.endsWith('.png') ? 'image/png' : input.path.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  await db
    .insert(media)
    .values({
      path: input.path,
      mime,
      alt: input.alt,
      credit: input.credit ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
    })
    .onConflictDoNothing();
}

export async function updateMediaTexts(db: Database, actor: Actor, id: string, input: z.input<typeof MediaTextInput>) {
  const texts = MediaTextInput.parse(input);
  const [row] = await db
    .update(media)
    .set({ alt: texts.alt, credit: texts.credit ?? null })
    .where(eq(media.id, id))
    .returning();
  if (!row) throw new MediaError('NOT_FOUND');
  await recordAuditEvent(db, {
    actorType: actor.type,
    actorId: actor.id,
    action: 'media.updated',
    resourceType: 'media',
    resourceId: id,
    outcome: 'success',
  });
  return row;
}

export async function listMedia(db: Database) {
  const rows = await db.select().from(media).orderBy(desc(media.createdAt));
  return rows.map((row) => ({
    id: row.id,
    ref: row.path ?? `media:${row.id}`,
    src: mediaUrl(row),
    alt: row.alt,
    credit: row.credit,
    width: row.width,
    height: row.height,
    bytes: row.bytes,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** Retrouve les médias cités par des références (`/images/...`, `media:<uuid>`), dans une langue. */
export async function resolveMedia(db: Database, refs: readonly string[], locale: Locale) {
  const ids = refs.filter((ref) => ref.startsWith('media:')).map((ref) => ref.slice(6));
  const paths = refs.filter((ref) => ref.startsWith('/images/'));
  const result: Record<string, ResolvedMedia> = {};
  for (const path of paths) result[path] = { src: path, alt: '', width: null, height: null, credit: null };
  if (!ids.length && !paths.length) return result;
  const rows = await db
    .select()
    .from(media)
    .where(or(ids.length ? inArray(media.id, ids) : undefined, paths.length ? inArray(media.path, paths) : undefined));
  for (const row of rows) {
    const resolved = {
      src: mediaUrl(row),
      alt: pick(row.alt, locale),
      width: row.width,
      height: row.height,
      credit: row.credit ? pick(row.credit, locale) : null,
    };
    result[row.path ?? `media:${row.id}`] = resolved;
  }
  return result;
}

/** Toutes les références de médias présentes dans des blocs (valeurs de champs, listes comprises). */
export function collectMediaRefs(value: unknown, into = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    if (/^(\/images\/[\w./-]+|media:[0-9a-f-]{36})$/u.test(value)) into.add(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectMediaRefs(item, into);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectMediaRefs(item, into);
  }
  return into;
}
