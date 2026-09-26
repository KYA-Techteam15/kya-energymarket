import { jobs, type Database, type JobRow } from '@kya-em/db';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Logger } from '../logging/createLogger.ts';

/**
 * File de travaux en base (spec 005b, FR-007). Un travail est mis en file dans la même transaction que
 * l'écriture qui le demande (une licence émise, un lot) : il ne se perd pas et ne bloque rien. Un
 * intervalle du serveur les exécute ; un échec est reprogrammé (1, 5, 15, 60 min) jusqu'à 5 tentatives.
 */
export type JobKind = 'mail.license_key' | 'mail.trial_ending' | 'mail.trial_ended';

export interface JobHandlers {
  readonly [kind: string]: (payload: Record<string, unknown>, job: JobRow) => Promise<void>;
}

const BACKOFF_MINUTES = [1, 5, 15, 60, 60];
/** Un travail « en cours » depuis plus longtemps a perdu son processus : il repart. */
const STALE_MINUTES = 10;

export async function enqueueJob(
  db: Database,
  input: { kind: JobKind; payload: Record<string, unknown>; reference?: string | null; runAt?: Date },
) {
  const [row] = await db
    .insert(jobs)
    .values({
      kind: input.kind,
      payload: input.payload,
      reference: input.reference ?? null,
      runAt: input.runAt ?? new Date(),
    })
    .returning();
  return row!;
}

/** Réserve les travaux dus (verrou sans attente : plusieurs processus ne prennent jamais le même). */
export async function claimDueJobs(db: Database, limit = 10): Promise<JobRow[]> {
  const result = await db.execute(sql`
    UPDATE ${jobs} SET status = 'running', locked_at = now(), attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM ${jobs}
      WHERE (status = 'pending' AND run_at <= now())
         OR (status = 'running' AND locked_at < now() - make_interval(mins => ${STALE_MINUTES}))
      ORDER BY run_at
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id`);
  const ids = ((result as unknown as { rows: { id: string }[] }).rows ?? []).map((row) => row.id);
  if (!ids.length) return [];
  return db.select().from(jobs).where(inArray(jobs.id, ids));
}

export async function completeJob(db: Database, id: string) {
  await db
    .update(jobs)
    .set({ status: 'done', finishedAt: new Date(), lockedAt: null, lastError: null })
    .where(eq(jobs.id, id));
}

export async function failJob(db: Database, job: JobRow, error: unknown) {
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 500);
  const exhausted = job.attempts >= job.maxAttempts;
  const delay = BACKOFF_MINUTES[Math.min(job.attempts - 1, BACKOFF_MINUTES.length - 1)] ?? 60;
  await db
    .update(jobs)
    .set({
      status: exhausted ? 'failed' : 'pending',
      lockedAt: null,
      lastError: message,
      runAt: new Date(Date.now() + delay * 60_000),
      finishedAt: exhausted ? new Date() : null,
    })
    .where(eq(jobs.id, job.id));
}

/** Exécute les travaux dus ; rend le nombre de réussites et d'échecs. */
export async function runDueJobs(db: Database, handlers: JobHandlers, logger?: Logger, limit = 10) {
  const due = await claimDueJobs(db, limit);
  let done = 0;
  let failed = 0;
  for (const job of due) {
    const handler = handlers[job.kind];
    try {
      if (!handler) throw new Error(`aucun gestionnaire pour ${job.kind}`);
      await handler(job.payload, job);
      await completeJob(db, job.id);
      done += 1;
    } catch (error) {
      failed += 1;
      logger?.warn({ job: job.id, kind: job.kind, attempt: job.attempts, err: error }, 'travail en échec');
      await failJob(db, job, error);
    }
  }
  return { done, failed };
}

/** Relance tout de suite un travail en échec (console). */
export async function retryJob(db: Database, id: string) {
  await db
    .update(jobs)
    .set({ status: 'pending', runAt: new Date(), attempts: 0, finishedAt: null })
    .where(and(eq(jobs.id, id), eq(jobs.status, 'failed')));
}

export async function listJobs(
  db: Database,
  filter: { references?: readonly string[]; status?: JobRow['status'] } = {},
) {
  const rows = await db
    .select()
    .from(jobs)
    .where(
      and(
        filter.references?.length ? inArray(jobs.reference, [...filter.references]) : undefined,
        filter.status ? eq(jobs.status, filter.status) : undefined,
      ),
    )
    .orderBy(desc(jobs.createdAt))
    .limit(500);
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    status: row.status,
    attempts: row.attempts,
    reference: row.reference,
    lastError: row.lastError,
    runAt: row.runAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    email: typeof row.payload.email === 'string' ? row.payload.email : null,
  }));
}

export async function countFailedJobs(db: Database) {
  const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(jobs).where(eq(jobs.status, 'failed'));
  return n;
}
