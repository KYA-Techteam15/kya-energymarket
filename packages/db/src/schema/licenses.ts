import { sql } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { organization, user } from './auth.ts';
import { editions, licenseTypes, products, type LicenseTypeNature, type LocalizedText } from './catalog.ts';

export type LicenseChannel = 'purchase' | 'trial' | 'staff' | 'batch' | 'partner';

/** Lot : licences distinctes générées en une fois (spec 005b). */
export const licenseBatches = pgTable(
  'license_batches',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    productId: uuid()
      .notNull()
      .references(() => products.id),
    licenseTypeId: uuid()
      .notNull()
      .references(() => licenseTypes.id),
    label: text().notNull(),
    reason: text().notNull(),
    mode: text().$type<'emails' | 'organization' | 'keys'>().notNull(),
    seats: integer().notNull(),
    count: integer().notNull(),
    /** Nom affiché dans le logiciel pour les licences sans titulaire. */
    customerName: text().notNull(),
    organizationId: text().references(() => organization.id, { onDelete: 'restrict' }),
    startsOnActivation: boolean().notNull().default(true),
    /** Clé d'unicité fournie par l'appelant : rejouer la génération rend le même lot. */
    idempotencyKey: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdBy: text(),
  },
  (table) => [uniqueIndex('license_batches_idempotency_idx').on(table.idempotencyKey)],
);

/**
 * Licences (spec 005, 005b) : le droit d'utiliser un logiciel, dans une édition, selon un type de
 * licence, pour un nombre de postes, au nom d'une organisation (ou en attente de rattachement). Les
 * conditions commerciales sont figées à l'émission ; les droits (fonctions, limites, filigrane) sont
 * lus dans le catalogue publié à chaque jeton émis.
 */
export const licenses = pgTable(
  'licenses',
  {
    /** Identifiant repris dans le jeton et les routes du logiciel (`lic_…`). */
    id: text().primaryKey(),
    productId: uuid()
      .notNull()
      .references(() => products.id),
    editionId: uuid()
      .notNull()
      .references(() => editions.id),
    seats: integer().notNull(),
    /** Titulaire ; `null` : clé à distribuer ou destinataire sans compte, rattachée plus tard. */
    organizationId: text().references(() => organization.id, { onDelete: 'restrict' }),
    licenseTypeId: uuid().references(() => licenseTypes.id, { onDelete: 'restrict' }),
    // Copie figée du type au moment de l'émission (statistiques justes, conditions tenues).
    typeName: jsonb().$type<LocalizedText>().notNull(),
    nature: text().$type<LicenseTypeNature>().notNull(),
    days: integer().notNull(),
    pricePerSeat: integer().notNull(),
    /** Montant payé en FCFA entiers ; 0 pour une licence offerte. */
    amount: integer().notNull().default(0),
    channel: text().$type<LicenseChannel>().notNull(),
    reason: text(),
    /** Référence de commande ou de Devis. */
    reference: text(),
    batchId: uuid().references(() => licenseBatches.id, { onDelete: 'restrict' }),
    recipientEmail: text(),
    /** La validité démarre à la première activation (dates vides jusque-là). */
    startsOnActivation: boolean().notNull().default(false),
    idempotencyKey: text(),
    /** Nom affiché dans le logiciel (organisation ou personne). */
    customerName: text().notNull(),
    /** Empreinte SHA-256 de la clé normalisée : sert à la retrouver sans la stocker en clair. */
    keyHash: text().notNull(),
    /** Clé chiffrée (AES-256-GCM), pour l'afficher au client. */
    keyCipher: text().notNull(),
    status: text().$type<'active' | 'revoked'>().notNull().default('active'),
    startsAt: timestamp({ withTimezone: true }),
    expiresAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdBy: text(),
    revokedAt: timestamp({ withTimezone: true }),
    revokedBy: text(),
  },
  (table) => [
    uniqueIndex('licenses_key_hash_idx').on(table.keyHash),
    index('licenses_organization_idx').on(table.organizationId),
    index('licenses_batch_idx').on(table.batchId),
    index('licenses_recipient_idx').on(table.recipientEmail),
    uniqueIndex('licenses_idempotency_idx').on(table.idempotencyKey),
  ],
);

/** Ordinateur activé sur une licence ; libéré, il garde sa trace (historique, réactivation). */
export const licenseActivations = pgTable(
  'license_activations',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    licenseId: text()
      .notNull()
      .references(() => licenses.id, { onDelete: 'cascade' }),
    deviceId: text().notNull(),
    deviceName: text(),
    activatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastRefreshAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    releasedAt: timestamp({ withTimezone: true }),
    releasedBy: text(),
  },
  (table) => [uniqueIndex('license_activations_device_idx').on(table.licenseId, table.deviceId)],
);

/** Poste attribué à un collègue : la clé et la marche à suivre lui ont été envoyées. */
/** Essai accordé : un par compte et par logiciel (spec 006). */
export const trialGrants = pgTable(
  'trial_grants',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    productId: uuid()
      .notNull()
      .references(() => products.id),
    licenseId: text()
      .notNull()
      .references(() => licenses.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('trial_grants_user_product_idx').on(table.userId, table.productId)],
);

export const licenseInvites = pgTable(
  'license_invites',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    licenseId: text()
      .notNull()
      .references(() => licenses.id, { onDelete: 'cascade' }),
    email: text().notNull(),
    sentAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    sentBy: text(),
  },
  (table) => [index('license_invites_license_idx').on(table.licenseId)],
);

export type LicenseRow = typeof licenses.$inferSelect;
export type LicenseBatchRow = typeof licenseBatches.$inferSelect;
export type LicenseActivationRow = typeof licenseActivations.$inferSelect;
