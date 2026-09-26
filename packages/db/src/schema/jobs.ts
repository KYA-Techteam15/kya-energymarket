import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * File de travaux en base (spec 005b) : courriels et tâches différées. Un travail en échec est
 * reprogrammé jusqu'à `maxAttempts` ; son état reste lisible dans la console.
 */
export const jobs = pgTable(
  'jobs',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    kind: text().notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    status: text().$type<'pending' | 'running' | 'done' | 'failed'>().notNull().default('pending'),
    attempts: integer().notNull().default(0),
    maxAttempts: integer().notNull().default(5),
    runAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp({ withTimezone: true }),
    lastError: text(),
    /** Objet concerné (licence, lot) : affichage et recherche, jamais un secret. */
    reference: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp({ withTimezone: true }),
  },
  (table) => [index('jobs_due_idx').on(table.status, table.runAt), index('jobs_reference_idx').on(table.reference)],
);

export type JobRow = typeof jobs.$inferSelect;
