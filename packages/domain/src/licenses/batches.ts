import {
  editions,
  jobs,
  licenseActivations,
  licenseBatches,
  licenses,
  licenseTypes,
  user,
  type Database,
  type LicenseBatchRow,
  type LocalizedText,
} from '@kya-em/db';
import { and, count, countDistinct, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { recordAuditEvent } from '../audit/recordAuditEvent.ts';
import type { Actor } from '../catalog/catalog.ts';
import { enqueueJob } from '../jobs/jobs.ts';
import { decryptLicenseKey } from './crypto.ts';
import {
  extendLicense,
  getLicensesByIds,
  insertLicense,
  LicenseError,
  offerOf,
  organizationForEmail,
  revokeLicense,
  type LicenseDependencies,
} from './licenses.ts';

/**
 * Lots (spec 005b, histoire 3) : des licences distinctes générées en une fois — une par courriel,
 * N pour une organisation, ou N clés à distribuer. Rejouer une génération avec la même clé
 * d'unicité rend le même lot, sans rien créer.
 */
export const MAX_BATCH = 500;

export const BatchInput = z
  .strictObject({
    licenseTypeId: z.uuid(),
    mode: z.enum(['emails', 'organization', 'keys']),
    emails: z.array(z.string().trim().toLowerCase().pipe(z.email())).max(MAX_BATCH).optional(),
    organizationId: z.string().min(1).max(64).optional(),
    count: z.number().int().min(1).max(MAX_BATCH).optional(),
    seats: z.number().int().min(1).max(10_000),
    label: z.string().trim().min(3).max(120),
    reason: z.string().trim().min(3).max(300),
    /** Nom affiché dans le logiciel pour les licences sans titulaire ; par défaut, le libellé. */
    customerName: z.string().trim().min(1).max(120).optional(),
    startsOnActivation: z.boolean().default(true),
    /** Montant payé par licence (achat groupé hors plateforme) ; 0 : offert. */
    amount: z.number().int().min(0).max(1_000_000_000).default(0),
    reference: z.string().trim().max(80).optional(),
    idempotencyKey: z.string().min(8).max(80),
  })
  .superRefine((value, context) => {
    if (value.mode === 'emails' && !value.emails?.length) {
      context.addIssue({ code: 'custom', path: ['emails'], message: 'au moins un courriel' });
    }
    if (value.mode === 'organization' && !value.organizationId) {
      context.addIssue({ code: 'custom', path: ['organizationId'], message: 'organisation requise' });
    }
    if (value.mode !== 'emails' && !value.count) {
      context.addIssue({ code: 'custom', path: ['count'], message: 'nombre de licences requis' });
    }
  });
export type BatchInputValue = z.input<typeof BatchInput>;

/** Courriels distincts, dans l'ordre de saisie (les doublons sont ignorés). */
export const uniqueEmails = (emails: readonly string[]) => [
  ...new Set(emails.map((email) => email.trim().toLowerCase())),
];

async function keysOf(deps: LicenseDependencies, batchId: string) {
  const rows = await deps.db
    .select({
      id: licenses.id,
      keyCipher: licenses.keyCipher,
      recipientEmail: licenses.recipientEmail,
      customerName: licenses.customerName,
    })
    .from(licenses)
    .where(eq(licenses.batchId, batchId))
    .orderBy(licenses.createdAt);
  return rows.map((row) => ({
    licenseId: row.id,
    key: decryptLicenseKey(row.keyCipher, deps.secret) ?? '',
    recipient: row.recipientEmail ?? row.customerName,
  }));
}

export async function generateBatch(deps: LicenseDependencies, actor: Actor, input: BatchInputValue) {
  const values = BatchInput.parse(input);
  const { db } = deps;
  const [replay] = await db
    .select()
    .from(licenseBatches)
    .where(eq(licenseBatches.idempotencyKey, values.idempotencyKey))
    .limit(1);
  if (replay) return { batch: replay, keys: await keysOf(deps, replay.id), replayed: true };

  const offer = await offerOf(db, values.licenseTypeId);
  const emails = values.mode === 'emails' ? uniqueEmails(values.emails ?? []) : [];
  const total = values.mode === 'emails' ? emails.length : values.count!;
  const customerName = values.customerName ?? values.label;

  const batch = await db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const [created] = await tx
      .insert(licenseBatches)
      .values({
        productId: offer.product.id,
        licenseTypeId: offer.type.id,
        label: values.label,
        reason: values.reason,
        mode: values.mode,
        seats: values.seats,
        count: total,
        customerName,
        organizationId: values.mode === 'organization' ? values.organizationId! : null,
        startsOnActivation: values.startsOnActivation,
        idempotencyKey: values.idempotencyKey,
        createdBy: actor.id,
      })
      .returning();
    const common = {
      licenseTypeId: offer.type.id,
      seats: values.seats,
      channel: 'batch' as const,
      amount: values.amount,
      reason: values.reason,
      reference: values.reference ?? null,
      startsOnActivation: values.startsOnActivation,
      customerName,
      batchId: created!.id,
    };
    for (let index = 0; index < total; index += 1) {
      const email = emails[index];
      const organizationId =
        values.mode === 'organization' ? values.organizationId! : email ? await organizationForEmail(t, email) : null;
      const { license } = await insertLicense({ db: t, secret: deps.secret }, actor, offer, {
        ...common,
        organizationId,
        recipientEmail: email ?? null,
      });
      if (email) {
        await enqueueJob(t, {
          kind: 'mail.license_key',
          payload: { licenseId: license.id, email },
          reference: license.id,
        });
      }
    }
    await recordAuditEvent(t, {
      actorType: actor.type,
      actorId: actor.id,
      action: 'license.batch_generated',
      resourceType: 'license_batch',
      resourceId: created!.id,
      outcome: 'success',
      details: { mode: values.mode, count: total, type: offer.type.id, seats: values.seats },
    });
    return created!;
  });
  return { batch, keys: await keysOf(deps, batch.id), replayed: false };
}

export interface BatchSummary {
  readonly id: string;
  readonly label: string;
  readonly reason: string;
  readonly mode: LicenseBatchRow['mode'];
  readonly editionName: LocalizedText;
  readonly typeName: LocalizedText;
  readonly seats: number;
  readonly count: number;
  readonly activated: number;
  readonly revoked: number;
  readonly failedMails: number;
  readonly customerName: string;
  readonly createdAt: string;
  readonly createdBy: string | null;
  readonly createdByName: string | null;
}

const summarySelect = (db: Database) =>
  db
    .select({
      batch: licenseBatches,
      editionName: editions.name,
      typeName: licenseTypes.name,
      createdByName: user.name,
    })
    .from(licenseBatches)
    .innerJoin(licenseTypes, eq(licenseBatches.licenseTypeId, licenseTypes.id))
    .innerJoin(editions, eq(licenseTypes.editionId, editions.id))
    .leftJoin(user, eq(licenseBatches.createdBy, user.id));

async function summariesOf(db: Database, rows: Awaited<ReturnType<ReturnType<typeof summarySelect>['limit']>>) {
  const ids = rows.map((row) => row.batch.id);
  if (!ids.length) return [];
  const [activated, revoked, failed] = await Promise.all([
    db
      .select({ batchId: licenses.batchId, n: countDistinct(licenses.id) })
      .from(licenses)
      .innerJoin(licenseActivations, eq(licenseActivations.licenseId, licenses.id))
      .where(inArray(licenses.batchId, ids))
      .groupBy(licenses.batchId),
    db
      .select({ batchId: licenses.batchId, n: count() })
      .from(licenses)
      .where(and(inArray(licenses.batchId, ids), eq(licenses.status, 'revoked')))
      .groupBy(licenses.batchId),
    db
      .select({ batchId: licenses.batchId, n: count() })
      .from(jobs)
      .innerJoin(licenses, eq(jobs.reference, licenses.id))
      .where(and(inArray(licenses.batchId, ids), eq(jobs.status, 'failed')))
      .groupBy(licenses.batchId),
  ]);
  const of = (list: { batchId: string | null; n: number }[], id: string) =>
    list.find((row) => row.batchId === id)?.n ?? 0;
  return rows.map(({ batch, editionName, typeName, createdByName }): BatchSummary => ({
    id: batch.id,
    label: batch.label,
    reason: batch.reason,
    mode: batch.mode,
    editionName,
    typeName,
    seats: batch.seats,
    count: batch.count,
    activated: of(activated, batch.id),
    revoked: of(revoked, batch.id),
    failedMails: of(failed, batch.id),
    customerName: batch.customerName,
    createdAt: batch.createdAt.toISOString(),
    createdBy: batch.createdBy,
    createdByName,
  }));
}

export async function listBatches(db: Database, options: { limit?: number } = {}) {
  const rows = await summarySelect(db)
    .orderBy(desc(licenseBatches.createdAt))
    .limit(options.limit ?? 100);
  return summariesOf(db, rows);
}

export async function getBatch(deps: LicenseDependencies, batchId: string) {
  const rows = await summarySelect(deps.db).where(eq(licenseBatches.id, batchId)).limit(1);
  const [summary] = await summariesOf(deps.db, rows);
  if (!summary) return null;
  const ids = (await deps.db.select({ id: licenses.id }).from(licenses).where(eq(licenses.batchId, batchId))).map(
    (row) => row.id,
  );
  return { batch: summary, licenses: await getLicensesByIds(deps, ids) };
}

async function batchLicenseIds(db: Database, batchId: string, onlyActive = true) {
  const [known] = await db.select({ id: licenseBatches.id }).from(licenseBatches).where(eq(licenseBatches.id, batchId));
  if (!known) throw new LicenseError('BATCH_NOT_FOUND');
  const rows = await db
    .select({ id: licenses.id })
    .from(licenses)
    .where(and(eq(licenses.batchId, batchId), onlyActive ? eq(licenses.status, 'active') : undefined));
  return rows.map((row) => row.id);
}

/** Prolonge toutes les licences actives d'un lot (celles qui n'ont pas démarré gagnent des jours). */
export async function extendBatch(
  db: Database,
  actor: Actor,
  input: { batchId: string; days: number; reason?: string },
) {
  z.number().int().min(1).max(3650).parse(input.days);
  const ids = await batchLicenseIds(db, input.batchId);
  for (const licenseId of ids)
    await extendLicense(db, actor, { licenseId, days: input.days, reason: input.reason ?? null });
  return ids.length;
}

export async function revokeBatch(db: Database, actor: Actor, input: { batchId: string; reason?: string }) {
  const ids = await batchLicenseIds(db, input.batchId);
  for (const licenseId of ids) await revokeLicense(db, actor, { licenseId, reason: input.reason ?? null });
  return ids.length;
}

/** Remet en file le courriel de clé des licences d'un lot qui ne sont pas encore activées. */
export async function resendBatchMails(db: Database, actor: Actor, batchId: string) {
  await batchLicenseIds(db, batchId);
  const rows = await db
    .select({ id: licenses.id, email: licenses.recipientEmail })
    .from(licenses)
    .where(
      and(
        eq(licenses.batchId, batchId),
        eq(licenses.status, 'active'),
        isNotNull(licenses.recipientEmail),
        isNull(licenses.startsAt),
      ),
    );
  for (const row of rows) {
    await enqueueJob(db, {
      kind: 'mail.license_key',
      payload: { licenseId: row.id, email: row.email },
      reference: row.id,
    });
  }
  await recordAuditEvent(db, {
    actorType: actor.type,
    actorId: actor.id,
    action: 'license.batch_mails_resent',
    resourceType: 'license_batch',
    resourceId: batchId,
    outcome: 'success',
    details: { count: rows.length },
  });
  return rows.length;
}

/** Remet en file le courriel de clé d'une licence (à son destinataire ou à un autre courriel). */
export async function resendLicenseKey(db: Database, input: { licenseId: string; email?: string }) {
  const [row] = await db.select().from(licenses).where(eq(licenses.id, input.licenseId)).limit(1);
  if (!row) throw new LicenseError('LICENSE_NOT_FOUND');
  const email = input.email?.trim().toLowerCase() ?? row.recipientEmail;
  if (!email) throw new LicenseError('NO_RECIPIENT');
  z.email().parse(email);
  await enqueueJob(db, { kind: 'mail.license_key', payload: { licenseId: row.id, email }, reference: row.id });
  return email;
}

/** Actions groupées de la console sur une sélection de licences. */
export async function extendLicenses(db: Database, actor: Actor, input: { ids: readonly string[]; days: number }) {
  z.number().int().min(1).max(3650).parse(input.days);
  for (const licenseId of input.ids) await extendLicense(db, actor, { licenseId, days: input.days });
  return input.ids.length;
}

export async function revokeLicenses(db: Database, actor: Actor, input: { ids: readonly string[]; reason?: string }) {
  for (const licenseId of input.ids) await revokeLicense(db, actor, { licenseId, reason: input.reason ?? null });
  return input.ids.length;
}

/** Clés au format CSV (point-virgule, pour les tableurs en français). */
export async function licenseKeysCsv(deps: LicenseDependencies, ids: readonly string[]) {
  const views = await getLicensesByIds(deps, ids);
  const cell = (value: string | null) => `"${(value ?? '').replace(/"/gu, '""')}"`;
  const lines = views.map((view) =>
    [
      view.id,
      view.key,
      view.recipientEmail ?? view.customerName,
      view.editionCode,
      view.typeName.fr,
      view.expiresAt ?? '',
    ]
      .map(cell)
      .join(';'),
  );
  return ['licence;cle;destinataire;edition;type;fin', ...lines].join('\n');
}
