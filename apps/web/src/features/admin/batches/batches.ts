import type { BatchInputValue } from '@kya-em/domain';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { batchAction, generateFromConsole, loadBatch, loadBatches, retryMail } from './batches.server';

// Fonctions serveur des lots ; la génération est validée par le schéma du domaine, côté serveur.
export const getBatches = createServerFn({ method: 'GET' }).handler(() => loadBatches());

export const getBatchFn = createServerFn({ method: 'GET' })
  .validator((input: { id: string }) => ({ id: z.uuid().parse(input.id) }))
  .handler(({ data }) => loadBatch(data.id));

export const generateBatchFn = createServerFn({ method: 'POST' })
  // Validé par `generateBatch` (schéma BatchInput du domaine), côté serveur.
  .validator((input: BatchInputValue) => input)
  .handler(({ data }) => generateFromConsole(data));

const ActionRequest = z.strictObject({
  id: z.uuid(),
  action: z.enum(['extend', 'revoke', 'resend']),
  days: z.number().int().min(1).max(3650).optional(),
  reason: z.string().trim().max(300).optional(),
});
export const batchActionFn = createServerFn({ method: 'POST' })
  .validator((input: z.input<typeof ActionRequest>) => ActionRequest.parse(input))
  .handler(({ data }) => batchAction(data));

export const retryMailFn = createServerFn({ method: 'POST' })
  .validator((input: { id: string }) => ({ id: z.uuid().parse(input.id) }))
  .handler(({ data }) => retryMail(data.id));
