import { auditEvents, user, type Database } from '@kya-em/db';
import { and, desc, eq, ilike, lt } from 'drizzle-orm';
import { z } from 'zod';

/** Journal d'audit de la console (spec 005b) : filtres par personne, client IA et objet. */
export const JournalFilters = z.strictObject({
  actorType: z.enum(['user', 'kya_staff', 'system', 'software', 'mcp_client']).optional(),
  resourceType: z.string().max(40).optional(),
  action: z.string().max(60).optional(),
  before: z.iso.datetime().optional(),
  limit: z.number().int().min(1).max(200).default(100),
});

export async function listJournal(db: Database, input: z.input<typeof JournalFilters> = {}) {
  const filters = JournalFilters.parse(input);
  const rows = await db
    .select({ event: auditEvents, actorName: user.name, actorEmail: user.email })
    .from(auditEvents)
    .leftJoin(user, eq(auditEvents.actorId, user.id))
    .where(
      and(
        filters.actorType ? eq(auditEvents.actorType, filters.actorType) : undefined,
        filters.resourceType ? eq(auditEvents.resourceType, filters.resourceType) : undefined,
        filters.action ? ilike(auditEvents.action, `${filters.action.replace(/[\\%_]/gu, '')}%`) : undefined,
        filters.before ? lt(auditEvents.occurredAt, new Date(filters.before)) : undefined,
      ),
    )
    .orderBy(desc(auditEvents.occurredAt))
    .limit(filters.limit);
  return rows.map(({ event, actorName, actorEmail }) => ({
    id: event.id,
    occurredAt: event.occurredAt.toISOString(),
    actorType: event.actorType,
    actorName,
    actorEmail,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    outcome: event.outcome,
    details: JSON.stringify(event.details),
  }));
}
