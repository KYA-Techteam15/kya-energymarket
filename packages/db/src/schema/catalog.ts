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
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

/** Texte en deux langues ; l'anglais peut manquer (le français sert alors de repli). */
export interface LocalizedText {
  fr: string;
  en?: string;
}

/**
 * Catalogue (spec 004, 005b) : logiciels, fonctions, éditions, types de licence. Tout ce qu'une page, l'API, le MCP
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
    /** Codes d'édition que le logiciel connaît (profil porté par le jeton) ; vide : libre. */
    softwareEditions: jsonb().$type<string[]>().notNull().default([]),
    /** Incrémenté à chaque publication du catalogue (spec 005b). */
    catalogVersion: integer().notNull().default(1),
    /** Type de licence de l'essai gratuit (nature `trial`) ; `null` : pas d'essai (spec 006). */
    trialLicenseTypeId: uuid().references((): AnyPgColumn => licenseTypes.id, { onDelete: 'set null' }),
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
    /** Profil dans le logiciel : code d'édition porté par le jeton (`commercial`, `academic`…). */
    softwareEdition: text().notNull(),
    /** Caractéristiques affichées sur le site (texte libre, sans effet dans le logiciel). */
    highlights: jsonb().$type<LocalizedText[]>().notNull().default([]),
    /** Montrée sur le site. */
    visible: boolean().notNull().default(false),
    /** Achetable sur le site. */
    forSale: boolean().notNull().default(false),
    archivedAt: timestamp({ withTimezone: true }),
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

export type LicenseTypeNature = 'sale' | 'trial' | 'free' | 'education' | 'partner';

/**
 * Type de licence d'une édition (spec 005b) : nom, nature, durée en jours, prix par poste en FCFA
 * entiers, postes permis. Masqué ou hors vente, il reste utilisable par l'équipe ; il s'archive, il
 * ne se supprime pas.
 */
export const licenseTypes = pgTable(
  'license_types',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    editionId: uuid()
      .notNull()
      .references(() => editions.id, { onDelete: 'restrict' }),
    name: jsonb().$type<LocalizedText>().notNull(),
    nature: text().$type<LicenseTypeNature>().notNull().default('sale'),
    days: integer().notNull(),
    pricePerSeat: integer().notNull(),
    /** Prix non définitif, affiché avec la mention « prix exemple ». */
    indicative: boolean().notNull().default(true),
    seatsMin: integer().notNull().default(1),
    /** `null` : le maximum de l'édition. */
    seatsMax: integer(),
    renewable: boolean().notNull().default(true),
    visible: boolean().notNull().default(false),
    forSale: boolean().notNull().default(false),
    archivedAt: timestamp({ withTimezone: true }),
    sort: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('license_types_edition_idx').on(table.editionId)],
);

/** Brouillon de l'offre d'un logiciel : rien n'est public avant la publication (spec 005b). */
export const catalogDrafts = pgTable('catalog_drafts', {
  productId: uuid()
    .primaryKey()
    .references(() => products.id, { onDelete: 'cascade' }),
  document: jsonb().$type<Record<string, unknown>>().notNull(),
  /** Incrémenté à chaque changement : la publication vérifie qu'elle publie ce qu'elle a lu. */
  revision: integer().notNull().default(1),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedBy: text(),
});

export type ProductRow = typeof products.$inferSelect;
export type EditionRow = typeof editions.$inferSelect;
export type LicenseTypeRow = typeof licenseTypes.$inferSelect;
export type ProductFeatureRow = typeof productFeatures.$inferSelect;
