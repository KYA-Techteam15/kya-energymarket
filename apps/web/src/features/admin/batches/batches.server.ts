import {
  extendBatch,
  generateBatch,
  getBatch,
  listBatches,
  listJobs,
  resendBatchMails,
  retryJob,
  revokeBatch,
  type BatchInputValue,
} from '@kya-em/domain';
import { attempt, consoleStaff, FORBIDDEN } from '../console/access.server';

/** Lots dans la console (spec 005b, histoire 3). */
export async function loadBatches() {
  const current = await consoleStaff('licenses', 'read');
  if (!current) return null;
  return { batches: await listBatches(current.db), can: { write: current.can('licenses', 'write') } };
}

export async function loadBatch(batchId: string) {
  const current = await consoleStaff('licenses', 'read');
  if (!current) return null;
  const found = await getBatch({ db: current.db, secret: current.secret }, batchId);
  if (!found) return null;
  const mails = await listJobs(current.db, { references: found.licenses.map((license) => license.id) });
  return {
    ...found,
    mails,
    can: { write: current.can('licenses', 'write'), revoke: current.can('licenses', 'revoke') },
  };
}

export async function generateFromConsole(input: BatchInputValue) {
  const current = await consoleStaff('licenses', 'write');
  if (!current) return FORBIDDEN;
  return attempt(async () => {
    const { batch, keys, replayed } = await generateBatch(
      { db: current.db, secret: current.secret },
      current.actor,
      input,
    );
    return { batchId: batch.id, keys, replayed };
  });
}

export async function batchAction(input: {
  id: string;
  action: 'extend' | 'revoke' | 'resend';
  days?: number;
  reason?: string;
}) {
  const current = await consoleStaff('licenses', input.action === 'revoke' ? 'revoke' : 'write');
  if (!current) return FORBIDDEN;
  return attempt(async () => {
    if (input.action === 'extend')
      return extendBatch(current.db, current.actor, {
        batchId: input.id,
        days: input.days ?? 30,
        reason: input.reason,
      });
    if (input.action === 'revoke')
      return revokeBatch(current.db, current.actor, { batchId: input.id, reason: input.reason });
    return resendBatchMails(current.db, current.actor, input.id);
  });
}

export async function retryMail(jobId: string) {
  const current = await consoleStaff('licenses', 'write');
  if (!current) return FORBIDDEN;
  return attempt(() => retryJob(current.db, jobId).then(() => null));
}
