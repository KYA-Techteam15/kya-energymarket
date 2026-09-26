import { describe, expect, it } from 'vitest';
import { checkHealth } from './checkHealth.ts';

describe('santé (spec 001, FR-016)', () => {
  const now = () => new Date('2026-09-25T12:00:00.000Z');

  it('ok quand la base répond', async () => {
    expect(await checkHealth({ version: '0.1.0', environment: 'test', database: async () => {}, now })).toEqual({
      status: 'ok',
      version: '0.1.0',
      environment: 'test',
      checks: { database: 'ok' },
      time: '2026-09-25T12:00:00.000Z',
    });
  });

  it('dégradé quand la base échoue ou dépasse le délai', async () => {
    const failing = await checkHealth({
      version: '0.1.0',
      environment: 'test',
      database: async () => {
        throw new Error('connexion refusée');
      },
    });
    expect(failing).toMatchObject({ status: 'degraded', checks: { database: 'unavailable' } });
    const slow = await checkHealth({
      version: '0.1.0',
      environment: 'test',
      timeoutMs: 20,
      database: () => new Promise((resolve) => setTimeout(resolve, 200)),
    });
    expect(slow.checks.database).toBe('unavailable');
  });

  it('non configurée sans base', async () => {
    expect(await checkHealth({ version: '0.1.0', environment: 'development', database: undefined })).toMatchObject({
      status: 'ok',
      checks: { database: 'not_configured' },
    });
  });
});
