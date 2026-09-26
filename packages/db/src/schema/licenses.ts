import { sql } from 'drizzle-orm';
import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { organization } from './auth.ts';
import { editions, products } from './catalog.ts';

/**
 * Licences (spec 005) : le droit d'utiliser un logiciel, dans une édition, pour une durée et un nombre
 * de postes, au nom d'une organisation (personnelle ou d'entreprise). Les droits (fonctions,
 * limites, filigrane) ne sont pas recopiés : ils sont lus dans le catalogue à chaque jeton émis.
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
    /** Durée ISO 8601 de la formule (`P1M`, `P1Y`…). */
    duration: text().notNull(),
    seats: integer().notNull(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: 'restrict' }),
    /** Nom affiché dans le logiciel (organisation ou personne). */
    customerName: text().notNull(),
    /** Empreinte SHA-256 de la clé normalisée : sert à la retrouver sans la stocker en clair. */
    keyHash: text().notNull(),
    /** Clé chiffrée (AES-256-GCM), pour l'afficher au client. */
    keyCipher: text().notNull(),
    status: text().$type<'active' | 'revoked'>().notNull().default('active'),
    source: text().$type<'manual' | 'purchase' | 'trial'>().notNull(),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdBy: text(),
    revokedAt: timestamp({ withTimezone: true }),
    revokedBy: text(),
  },
  (table) => [
    uniqueIndex('licenses_key_hash_idx').on(table.keyHash),
    index('licenses_organization_idx').on(table.organizationId),
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
export type LicenseActivationRow = typeof licenseActivations.$inferSelect;
