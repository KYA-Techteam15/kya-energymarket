import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Journal d'audit : qui a fait quoi, sur quelle ressource, avec quel résultat (constitution, III et VI).
 * Table en ajout seul : aucune mise à jour ni suppression prévue.
 */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    actorType: text().notNull(),
    actorId: text(),
    action: text().notNull(),
    resourceType: text().notNull(),
    resourceId: text(),
    outcome: text().notNull(),
    details: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    requestId: text(),
  },
  (table) => [
    index('audit_events_occurred_at_idx').on(table.occurredAt.desc()),
    index('audit_events_resource_idx').on(table.resourceType, table.resourceId),
    index('audit_events_actor_idx').on(table.actorType, table.actorId),
  ],
);

export type AuditEventRow = typeof auditEvents.$inferSelect;
