import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { LocalizedText } from './catalog.ts';
import { products } from './catalog.ts';

/**
 * Pages composées (spec 004, ADR 0008) : une page = une clé (`presentation`, `tarifs`, `aide`…),
 * rattachée à un logiciel ou à la marketplace ; son contenu vit dans des versions par langue.
 */
export const pages = pgTable(
  'pages',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    /** `null` : page de la marketplace. */
    productId: uuid().references(() => products.id, { onDelete: 'cascade' }),
    key: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('pages_product_key_idx')
      .on(table.productId, table.key)
      .where(sql`${table.productId} is not null`),
    uniqueIndex('pages_market_key_idx')
      .on(table.key)
      .where(sql`${table.productId} is null`),
  ],
);

/** Bloc enregistré : type et champs, validés par le schéma de son type (`@kya-em/domain`). */
export interface StoredBlock {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

/**
 * Version d'une page dans une langue. Au plus un brouillon par page et par langue ; publier fige la
 * version et archive la précédente (retour arrière par restauration).
 */
export const pageVersions = pgTable(
  'page_versions',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    pageId: uuid()
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    locale: text().$type<'fr' | 'en'>().notNull(),
    version: integer().notNull(),
    status: text().$type<'draft' | 'published' | 'archived'>().notNull(),
    title: text().notNull(),
    description: text().notNull().default(''),
    blocks: jsonb().$type<StoredBlock[]>().notNull().default([]),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdBy: text(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp({ withTimezone: true }),
    publishedBy: text(),
  },
  (table) => [
    uniqueIndex('page_versions_number_idx').on(table.pageId, table.locale, table.version),
    uniqueIndex('page_versions_draft_idx')
      .on(table.pageId, table.locale)
      .where(sql`${table.status} = 'draft'`),
    uniqueIndex('page_versions_published_idx')
      .on(table.pageId, table.locale)
      .where(sql`${table.status} = 'published'`),
    index('page_versions_page_idx').on(table.pageId, table.locale),
  ],
);

/**
 * Médiathèque. `storageKey` : fichier du stockage objet, servi par `/media/<clé>` ; `path` : image
 * livrée avec l'application (`/images/...`). Texte alternatif obligatoire.
 */
export const media = pgTable(
  'media',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    storageKey: text(),
    path: text(),
    mime: text().notNull(),
    width: integer(),
    height: integer(),
    bytes: integer(),
    alt: jsonb().$type<LocalizedText>().notNull(),
    /** Mention affichée sur l'image (« Photo d'illustration »). */
    credit: jsonb().$type<LocalizedText>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdBy: text(),
  },
  (table) => [uniqueIndex('media_storage_key_idx').on(table.storageKey), uniqueIndex('media_path_idx').on(table.path)],
);

export type PageRow = typeof pages.$inferSelect;
export type PageVersionRow = typeof pageVersions.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
