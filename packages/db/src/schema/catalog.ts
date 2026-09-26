import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/** Texte en deux langues ; l'anglais peut manquer (le français sert alors de repli). */
export interface LocalizedText {
  fr: string;
  en?: string;
}

/**
 * Catalogue (spec 004) : logiciels, fonctions, éditions, durées. Tout ce qu'une page, l'API, le MCP
 * ou une licence affiche vient d'ici : aucun prix n'est recopié ailleurs (ADR 0008).
 */
export const products = pgTable(
  'products',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    slug: text().notNull(),
    name: text().notNull(),
    /** `available` : page et achat ; `soon` : visible au catalogue, sans page ; `hidden` : invisible. */
    status: text().$type<'available' | 'soon' | 'hidden'>().notNull().default('hidden'),
    sort: integer().notNull().default(0),
    kind: jsonb().$type<LocalizedText>().notNull(),
    summary: jsonb().$type<LocalizedText>().notNull(),
    /** Chemin ou identifiant de média du logo ; sans logo, le monogramme s'affiche. */
    logo: text(),
    monogram: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('products_slug_idx').on(table.slug)],
);

/** Fonction d'un logiciel ; la clé est fixée par le logiciel (`sizing.optimize`, `documents.word`…). */
export const productFeatures = pgTable(
  'product_features',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    key: text().notNull(),
    label: jsonb().$type<LocalizedText>().notNull(),
    sort: integer().notNull().default(0),
  },
  (table) => [uniqueIndex('product_features_key_idx').on(table.productId, table.key)],
);

export const editions = pgTable(
  'editions',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    /** Code stable, repris dans la licence (`commercial`, `academic`, `student`). */
    code: text().notNull(),
    name: jsonb().$type<LocalizedText>().notNull(),
    audience: jsonb().$type<LocalizedText>().notNull(),
    sort: integer().notNull().default(0),
    /** Texte du filigrane sur les documents ; `null` : aucun. */
    watermark: jsonb().$type<LocalizedText>(),
    graceDays: integer().notNull().default(0),
    /** `null` : sans limite. */
    maxSeats: integer(),
    maxProjects: integer(),
    active: boolean().notNull().default(true),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('editions_code_idx').on(table.productId, table.code)],
);

export const editionFeatures = pgTable(
  'edition_features',
  {
    editionId: uuid()
      .notNull()
      .references(() => editions.id, { onDelete: 'cascade' }),
    featureId: uuid()
      .notNull()
      .references(() => productFeatures.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.editionId, table.featureId] })],
);

/** Durée d'une édition et son prix par poste, en FCFA entiers. */
export const plans = pgTable(
  'plans',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    editionId: uuid()
      .notNull()
      .references(() => editions.id, { onDelete: 'cascade' }),
    /** Durée ISO 8601 : `P1D`, `P1M`, `P3M`, `P1Y`. */
    duration: text().notNull(),
    pricePerSeat: integer().notNull(),
    /** Prix non définitif, affiché avec la mention « prix exemple ». */
    indicative: boolean().notNull().default(true),
    active: boolean().notNull().default(true),
    sort: integer().notNull().default(0),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('plans_duration_idx').on(table.editionId, table.duration),
    index('plans_edition_idx').on(table.editionId),
  ],
);

export type ProductRow = typeof products.$inferSelect;
export type EditionRow = typeof editions.$inferSelect;
export type PlanRow = typeof plans.$inferSelect;
export type ProductFeatureRow = typeof productFeatures.$inferSelect;
