import { auditEvents } from '@kya-em/db';
import { createTestDatabase } from '@kya-em/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recordAuditEvent } from './recordAuditEvent.ts';

describe('audit (spec 001, FR-014)', () => {
  let handle: Awaited<ReturnType<typeof createTestDatabase>>;
  beforeAll(async () => {
    handle = await createTestDatabase();
  });
  afterAll(async () => {
    await handle.close();
  });

  it('enregistre acteur, action, ressource, résultat et horodatage UTC', async () => {
    const row = await recordAuditEvent(handle.db, {
      actorType: 'kya_staff',
      actorId: 'staff-1',
      action: 'license.revoke',
      resourceType: 'license',
      resourceId: 'lic-42',
      outcome: 'success',
    });
    expect(row).toMatchObject({
      actorType: 'kya_staff',
      action: 'license.revoke',
      resourceId: 'lic-42',
      outcome: 'success',
      details: {},
    });
    expect(row.occurredAt).toBeInstanceOf(Date);
    expect(await handle.db.select().from(auditEvents)).toHaveLength(1);
  });

  it('masque les clés sensibles des détails', async () => {
    const row = await recordAuditEvent(handle.db, {
      actorType: 'system',
      action: 'payment.webhook_received',
      resourceType: 'payment',
      outcome: 'success',
      details: { provider: 'semoa', signature: 'abc', nested: { apiKey: 'xyz', amount: 1000 } },
    });
    expect(row.details).toEqual({
      provider: 'semoa',
      signature: '[masqué]',
      nested: { apiKey: '[masqué]', amount: 1000 },
    });
  });

  it('refuse une action mal formée', async () => {
    await expect(
      recordAuditEvent(handle.db, {
        actorType: 'system',
        action: 'Révoquer',
        resourceType: 'license',
        outcome: 'success',
      }),
    ).rejects.toThrow();
  });
});
