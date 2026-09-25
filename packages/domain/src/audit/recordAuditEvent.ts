import { auditEvents, type AuditEventRow, type Database } from '@kya-em/db';
import { z } from 'zod';

/**
 * Service d'audit : la seule façon d'écrire dans `audit_events`.
 * Les détails ne doivent contenir aucun secret ; par précaution, toute clé sensible est masquée.
 */
export const AuditEventInput = z.object({
  actorType: z.enum(['user', 'kya_staff', 'system', 'software', 'mcp_client']),
  actorId: z.string().min(1).nullable().default(null),
  action: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/u, 'forme attendue : domaine.verbe'),
  resourceType: z.string().min(1),
  resourceId: z.string().min(1).nullable().default(null),
  outcome: z.enum(['success', 'denied', 'failure']),
  details: z.record(z.string(), z.unknown()).default({}),
  requestId: z.string().min(1).nullable().default(null),
});

export type AuditEventInputValue = z.input<typeof AuditEventInput>;

const SENSITIVE = /pass(word)?|secret|token|key|authorization|cookie|signature|card|pin/iu;

export function scrubDetails(details: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => {
      if (SENSITIVE.test(key)) return [key, '[masqué]'];
      if (value && typeof value === 'object' && !Array.isArray(value))
        return [key, scrubDetails(value as Record<string, unknown>)];
      return [key, value];
    }),
  );
}

export async function recordAuditEvent(db: Database, input: AuditEventInputValue): Promise<AuditEventRow> {
  const event = AuditEventInput.parse(input);
  const [row] = await db
    .insert(auditEvents)
    .values({ ...event, details: scrubDetails(event.details) })
    .returning();
  if (!row) throw new Error('audit : insertion sans retour');
  return row;
}
