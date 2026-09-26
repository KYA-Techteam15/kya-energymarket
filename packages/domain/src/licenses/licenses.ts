import { randomBytes } from 'node:crypto';
import {
  auditEvents,
  editions,
  licenseActivations,
  licenseBatches,
  licenseInvites,
  licenses,
  licenseTypes,
  member,
  organization,
  products,
  user,
  type Database,
  type LicenseChannel,
  type LicenseRow,
  type LocalizedText,
} from '@kya-em/db';
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gt,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  notExists,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { z } from 'zod';
import { kindOf } from '../accounts/organizations.ts';
import { CHANNELS, LICENSE_VIEWS, type LicenseViewName } from '../constants.ts';
import { recordAuditEvent } from '../audit/recordAuditEvent.ts';
import {
  getCatalogProduct,
  planCodeOf,
  type Actor,
  type CatalogEdition,
  type LicenseTypeNature,
} from '../catalog/catalog.ts';
import {
  decryptLicenseKey,
  encryptLicenseKey,
  generateLicenseKey,
  licenseKeyHash,
  type LicensePayload,
  type LicenseSigner,
} from './crypto.ts';

/**
 * Licences (spec 005, 005b). Les conditions commerciales (type, durée, prix, montant, canal) sont
 * figées à l'émission ; les droits (fonctions, limites, filigrane, délai de grâce) sont lus dans le
 * catalogue publié à chaque jeton : changer une édition atteint les licences au prochain
 * rafraîchissement.
 */

/** Au-delà, le poste doit se reconnecter pour rafraîchir sa licence (contrat KYA-SolDesign). */
export const OFFLINE_DAYS = 30;
export const DAY = 86_400_000;
export { CHANNELS, LICENSE_VIEWS, type LicenseViewName };
export type { LicenseChannel };

const EDITION_PREFIX: Record<string, string> = { commercial: 'COM', academic: 'ACA', student: 'ETU' };
const prefixOf = (code: string) => EDITION_PREFIX[code] ?? code.replace(/_/gu, '').slice(0, 3).toUpperCase();

export type ActivateError = 'KEY_UNKNOWN' | 'SEATS_EXHAUSTED';
export type RefreshError = 'LICENSE_UNKNOWN' | 'LICENSE_REVOKED' | 'DEVICE_RELEASED';

export type LicenseErrorCode =
  | 'PRODUCT_NOT_FOUND'
  | 'TYPE_NOT_FOUND'
  | 'TYPE_ARCHIVED'
  | 'ORGANIZATION_NOT_FOUND'
  | 'LICENSE_NOT_FOUND'
  | 'SEATS_BELOW_ACTIVE'
  | 'TOO_MANY_SEATS'
  | 'TOO_FEW_SEATS'
  | 'REASON_REQUIRED'
  | 'KEY_UNKNOWN'
  | 'ALREADY_CLAIMED'
  | 'BATCH_NOT_FOUND'
  | 'NO_RECIPIENT';

export class LicenseError extends Error {
  constructor(readonly code: LicenseErrorCode) {
    super(code);
  }
}

export interface LicenseDependencies {
  readonly db: Database;
  /** Secret du serveur : chiffrement des clés au repos. */
  readonly secret: string;
}

const newLicenseId = () => `lic_${randomBytes(9).toString('base64url').replace(/[-_]/gu, 'x')}`;

export const licenseAudit = (
  db: Database,
  actor: Actor,
  action: string,
  licenseId: string,
  details: Record<string, unknown> = {},
) =>
  recordAuditEvent(db, {
    actorType: actor.type,
    actorId: actor.id,
    action,
    resourceType: 'license',
    resourceId: licenseId,
    outcome: 'success',
    details,
  });

/** Type de licence avec son édition et son logiciel (offre publiée, archivés compris). */
export async function offerOf(db: Database, licenseTypeId: string) {
  const [row] = await db
    .select({
      type: licenseTypes,
      edition: editions,
      product: { id: products.id, slug: products.slug, name: products.name },
    })
    .from(licenseTypes)
    .innerJoin(editions, eq(licenseTypes.editionId, editions.id))
    .innerJoin(products, eq(editions.productId, products.id))
    .where(eq(licenseTypes.id, licenseTypeId))
    .limit(1);
  if (!row) throw new LicenseError('TYPE_NOT_FOUND');
  return row;
}
export type Offer = Awaited<ReturnType<typeof offerOf>>;

async function organizationName(db: Database, organizationId: string) {
  const [row] = await db.select().from(organization).where(eq(organization.id, organizationId)).limit(1);
  if (!row) throw new LicenseError('ORGANIZATION_NOT_FOUND');
  return row.name;
}

export const IssueInput = z.strictObject({
  licenseTypeId: z.uuid(),
  seats: z.number().int().min(1).max(10_000),
  /** Titulaire ; absent : destinataire (courriel) ou clé à distribuer. */
  organizationId: z.string().min(1).max(64).nullable().optional(),
  recipientEmail: z.email().max(254).nullable().optional(),
  /** Nom affiché dans le logiciel tant qu'il n'y a pas de titulaire. */
  customerName: z.string().trim().min(1).max(120).optional(),
  channel: z.enum(CHANNELS),
  /** Montant payé pour cette licence, en FCFA entiers. */
  amount: z.number().int().min(0).max(1_000_000_000).default(0),
  reason: z.string().trim().max(300).nullable().optional(),
  reference: z.string().trim().max(80).nullable().optional(),
  startsOnActivation: z.boolean().default(false),
  startsAt: z.date().optional(),
  idempotencyKey: z.string().min(8).max(80).optional(),
});
export type IssueInputValue = z.input<typeof IssueInput>;

/** Insère une licence (émission seule ou lot) ; `db` peut être une transaction. */
export async function insertLicense(
  deps: LicenseDependencies,
  actor: Actor,
  offer: Offer,
  values: z.output<typeof IssueInput> & { batchId?: string },
) {
  const { db } = deps;
  const { type, edition, product } = offer;
  if (type.archivedAt || edition.archivedAt) throw new LicenseError('TYPE_ARCHIVED');
  const max = type.seatsMax ?? edition.maxSeats;
  if (max !== null && values.seats > max) throw new LicenseError('TOO_MANY_SEATS');
  if (values.seats < type.seatsMin) throw new LicenseError('TOO_FEW_SEATS');
  if (values.channel !== 'purchase' && values.channel !== 'trial' && !values.reason?.trim()) {
    throw new LicenseError('REASON_REQUIRED');
  }
  const recipient = values.recipientEmail?.trim().toLowerCase() ?? null;
  const customerName = values.organizationId
    ? await organizationName(db, values.organizationId)
    : (values.customerName ?? recipient ?? product.name);
  const key = generateLicenseKey(prefixOf(edition.code), planCodeOf(type.days));
  const startsAt = values.startsOnActivation ? null : (values.startsAt ?? new Date());
  const [row] = await db
    .insert(licenses)
    .values({
      id: newLicenseId(),
      productId: product.id,
      editionId: edition.id,
      licenseTypeId: type.id,
      typeName: type.name,
      nature: type.nature,
      days: type.days,
      pricePerSeat: type.pricePerSeat,
      amount: values.amount,
      channel: values.channel,
      reason: values.reason?.trim() || null,
      reference: values.reference?.trim() || null,
      seats: values.seats,
      organizationId: values.organizationId ?? null,
      recipientEmail: recipient,
      customerName,
      keyHash: licenseKeyHash(key),
      keyCipher: encryptLicenseKey(key, deps.secret),
      startsOnActivation: values.startsOnActivation,
      startsAt,
      expiresAt: startsAt ? new Date(startsAt.getTime() + type.days * DAY) : null,
      batchId: values.batchId ?? null,
      idempotencyKey: values.idempotencyKey ?? null,
      createdBy: actor.id,
    })
    .returning();
  await licenseAudit(db, actor, 'license.issued', row!.id, {
    product: product.slug,
    edition: edition.code,
    type: type.id,
    seats: values.seats,
    channel: values.channel,
    amount: values.amount,
    ...(values.batchId ? { batch: values.batchId } : {}),
  });
  return { license: row!, key };
}

/** Émet une licence et rend sa clé ; rejouée avec la même clé d'unicité, rend la même licence. */
export async function issueLicense(deps: LicenseDependencies, actor: Actor, input: IssueInputValue) {
  const values = IssueInput.parse(input);
  const { db } = deps;
  if (values.idempotencyKey) {
    const [existing] = await db
      .select()
      .from(licenses)
      .where(eq(licenses.idempotencyKey, values.idempotencyKey))
      .limit(1);
    if (existing) {
      return { license: existing, key: decryptLicenseKey(existing.keyCipher, deps.secret) ?? '', replayed: true };
    }
  }
  const offer = await offerOf(db, values.licenseTypeId);
  return { ...(await insertLicense(deps, actor, offer, values)), replayed: false };
}

// ---------------------------------------------------------------- logiciel : jetons

async function licenseWithProduct(db: Database, where: SQL) {
  const [row] = await db
    .select({ license: licenses, productSlug: products.slug })
    .from(licenses)
    .innerJoin(products, eq(licenses.productId, products.id))
    .where(where)
    .limit(1);
  return row ?? null;
}

async function publishedEdition(db: Database, productSlug: string, editionId: string): Promise<CatalogEdition> {
  const product = await getCatalogProduct(db, productSlug);
  const edition = product?.editions.find((item) => item.id === editionId);
  if (!edition) throw new LicenseError('PRODUCT_NOT_FOUND');
  return edition;
}

async function issueToken(
  db: Database,
  signer: LicenseSigner,
  row: { license: LicenseRow; productSlug: string },
  deviceId: string,
) {
  const edition = await publishedEdition(db, row.productSlug, row.license.editionId);
  const { license } = row;
  const payload: LicensePayload = {
    licenseId: license.id,
    customer: license.customerName,
    edition: edition.softwareEdition,
    plan: planCodeOf(license.days),
    features: edition.features,
    limits: { maxProjects: edition.maxProjects, seats: license.seats },
    watermark: edition.watermark ? edition.softwareEdition : null,
    deviceId,
    issuedAt: new Date().toISOString(),
    startsAt: license.startsAt!.toISOString(),
    expiresAt: license.expiresAt!.toISOString(),
    graceDays: edition.graceDays,
    offlineDays: OFFLINE_DAYS,
  };
  return signer.sign(payload);
}

const DeviceInput = z.object({
  deviceId: z.string().trim().min(8).max(128),
  deviceName: z.string().trim().max(80).optional(),
});

/**
 * Activation par clé (`POST /licenses/activate`). Réactiver un poste connu rend un jeton neuf sans
 * consommer ; sinon un poste libre est pris, sous verrou. Une licence qui démarre à l'activation
 * reçoit ses dates à ce moment.
 */
export async function activateLicense(
  deps: LicenseDependencies & { signer: LicenseSigner },
  input: { key: string; deviceId: string; deviceName?: string },
): Promise<{ token: string } | { error: ActivateError }> {
  const device = DeviceInput.safeParse(input);
  if (!device.success || typeof input.key !== 'string' || input.key.length > 64) return { error: 'KEY_UNKNOWN' };
  const { db } = deps;
  const found = await licenseWithProduct(db, eq(licenses.keyHash, licenseKeyHash(input.key)));
  if (!found || found.license.status === 'revoked') return { error: 'KEY_UNKNOWN' };

  const outcome = await db.transaction(async (tx) => {
    // Verrou sur la licence : le décompte des postes et l'activation se font d'un seul tenant.
    const [locked] = await tx.select().from(licenses).where(eq(licenses.id, found.license.id)).for('update');
    const rows = await tx.select().from(licenseActivations).where(eq(licenseActivations.licenseId, found.license.id));
    const mine = rows.find((row) => row.deviceId === device.data.deviceId);
    if (mine && !mine.releasedAt) {
      await tx
        .update(licenseActivations)
        .set({ lastRefreshAt: new Date(), ...(device.data.deviceName ? { deviceName: device.data.deviceName } : {}) })
        .where(eq(licenseActivations.id, mine.id));
      return 'reactivated' as const;
    }
    const active = rows.filter((row) => !row.releasedAt).length;
    if (active >= found.license.seats) return 'full' as const;
    if (!locked!.startsAt) {
      const now = new Date();
      await tx
        .update(licenses)
        .set({ startsAt: now, expiresAt: new Date(now.getTime() + locked!.days * DAY) })
        .where(eq(licenses.id, locked!.id));
    }
    if (mine) {
      await tx
        .update(licenseActivations)
        .set({
          releasedAt: null,
          releasedBy: null,
          activatedAt: new Date(),
          lastRefreshAt: new Date(),
          deviceName: device.data.deviceName ?? mine.deviceName,
        })
        .where(eq(licenseActivations.id, mine.id));
    } else {
      await tx.insert(licenseActivations).values({
        licenseId: found.license.id,
        deviceId: device.data.deviceId,
        deviceName: device.data.deviceName ?? null,
      });
    }
    return 'activated' as const;
  });

  if (outcome === 'full') return { error: 'SEATS_EXHAUSTED' };
  if (outcome === 'activated') {
    await licenseAudit(db, { type: 'software', id: null }, 'license.activated', found.license.id, {
      device: device.data.deviceId.slice(0, 8),
    });
  }
  const fresh = (await licenseWithProduct(db, eq(licenses.id, found.license.id)))!;
  return { token: await issueToken(db, deps.signer, fresh, device.data.deviceId) };
}

/** Rafraîchissement (`POST /licenses/{id}/refresh`) : droits et dates du moment. */
export async function refreshLicense(
  deps: LicenseDependencies & { signer: LicenseSigner },
  input: { licenseId: string; deviceId: string },
): Promise<{ token: string } | { error: RefreshError }> {
  const { db } = deps;
  if (typeof input.licenseId !== 'string' || typeof input.deviceId !== 'string') return { error: 'LICENSE_UNKNOWN' };
  const found = await licenseWithProduct(db, eq(licenses.id, input.licenseId));
  if (!found) return { error: 'LICENSE_UNKNOWN' };
  if (found.license.status === 'revoked') return { error: 'LICENSE_REVOKED' };
  const [activation] = await db
    .select()
    .from(licenseActivations)
    .where(and(eq(licenseActivations.licenseId, input.licenseId), eq(licenseActivations.deviceId, input.deviceId)))
    .limit(1);
  if (!activation || !found.license.startsAt) return { error: 'LICENSE_UNKNOWN' };
  if (activation.releasedAt) return { error: 'DEVICE_RELEASED' };
  await db
    .update(licenseActivations)
    .set({ lastRefreshAt: new Date() })
    .where(eq(licenseActivations.id, activation.id));
  return { token: await issueToken(db, deps.signer, found, input.deviceId) };
}

/** Le logiciel libère son poste (`POST /licenses/{id}/release`) ; sans effet si déjà libre. */
export async function releaseDevice(db: Database, input: { licenseId: string; deviceId: string }) {
  if (typeof input.licenseId !== 'string' || typeof input.deviceId !== 'string') return;
  const released = await db
    .update(licenseActivations)
    .set({ releasedAt: new Date(), releasedBy: 'device' })
    .where(
      and(
        eq(licenseActivations.licenseId, input.licenseId),
        eq(licenseActivations.deviceId, input.deviceId),
        isNull(licenseActivations.releasedAt),
      ),
    )
    .returning({ id: licenseActivations.id });
  if (released.length) {
    await licenseAudit(db, { type: 'software', id: null }, 'license.seat_released', input.licenseId, { by: 'device' });
  }
}

/**
 * Offre du logiciel au format `EditionDescriptor` de KYA-SolDesign (`GET /products/{slug}/editions`) :
 * éditions et types visibles, un descripteur par profil du logiciel.
 */
export async function editionDescriptors(db: Database, productSlug: string) {
  const product = await getCatalogProduct(db, productSlug, { publicOnly: true });
  if (!product) return null;
  return product.editions.map((edition) => ({
    edition: edition.softwareEdition,
    features: edition.features,
    limits: { maxProjects: edition.maxProjects, seats: edition.maxSeats ?? 1 },
    watermark: edition.watermark ? edition.softwareEdition : null,
    graceDays: edition.graceDays,
    plans: edition.types.map((type) => ({
      edition: edition.softwareEdition,
      plan: planCodeOf(type.days),
      days: type.days,
    })),
  }));
}

// ---------------------------------------------------------------- équipe et client : gestion

async function requireLicense(db: Database, licenseId: string) {
  const [row] = await db.select().from(licenses).where(eq(licenses.id, licenseId)).limit(1);
  if (!row) throw new LicenseError('LICENSE_NOT_FOUND');
  return row;
}

/** Libère un poste depuis l'espace client ou la console : effectif au prochain rafraîchissement. */
export async function releaseSeat(db: Database, actor: Actor, input: { licenseId: string; activationId: string }) {
  const released = await db
    .update(licenseActivations)
    .set({ releasedAt: new Date(), releasedBy: actor.id })
    .where(
      and(
        eq(licenseActivations.id, input.activationId),
        eq(licenseActivations.licenseId, input.licenseId),
        isNull(licenseActivations.releasedAt),
      ),
    )
    .returning({ id: licenseActivations.id });
  if (released.length) await licenseAudit(db, actor, 'license.seat_released', input.licenseId, { by: actor.type });
  return released.length > 0;
}

/** Nouvelle date de fin ; une licence pas encore démarrée voit sa durée allongée à la place. */
export async function extendLicense(
  db: Database,
  actor: Actor,
  input: { licenseId: string; expiresAt?: Date; days?: number; reason?: string | null },
) {
  const row = await requireLicense(db, input.licenseId);
  if (!row.expiresAt) {
    const extra = input.days ?? 0;
    await db
      .update(licenses)
      .set({ days: row.days + extra })
      .where(eq(licenses.id, row.id));
    await licenseAudit(db, actor, 'license.extended', row.id, { days: extra, reason: input.reason ?? null });
    return;
  }
  const next = input.expiresAt ?? new Date(row.expiresAt.getTime() + (input.days ?? 0) * DAY);
  await db.update(licenses).set({ expiresAt: next }).where(eq(licenses.id, row.id));
  await licenseAudit(db, actor, 'license.extended', row.id, {
    from: row.expiresAt.toISOString(),
    to: next.toISOString(),
    reason: input.reason ?? null,
  });
}

export async function setLicenseSeats(db: Database, actor: Actor, input: { licenseId: string; seats: number }) {
  const row = await requireLicense(db, input.licenseId);
  z.number().int().min(1).max(10_000).parse(input.seats);
  const [{ active } = { active: 0 }] = await db
    .select({ active: sql<number>`count(*)::int` })
    .from(licenseActivations)
    .where(and(eq(licenseActivations.licenseId, row.id), isNull(licenseActivations.releasedAt)));
  if (input.seats < active) throw new LicenseError('SEATS_BELOW_ACTIVE');
  await db.update(licenses).set({ seats: input.seats }).where(eq(licenses.id, row.id));
  await licenseAudit(db, actor, 'license.seats_changed', row.id, { from: row.seats, to: input.seats });
}

export async function revokeLicense(db: Database, actor: Actor, input: { licenseId: string; reason?: string | null }) {
  const row = await requireLicense(db, input.licenseId);
  if (row.status === 'revoked') return;
  await db
    .update(licenses)
    .set({ status: 'revoked', revokedAt: new Date(), revokedBy: actor.id })
    .where(eq(licenses.id, row.id));
  await licenseAudit(db, actor, 'license.revoked', row.id, { reason: input.reason ?? null });
}

export async function recordSeatInvite(db: Database, actor: Actor, input: { licenseId: string; email: string }) {
  const email = z.email().parse(input.email.trim().toLowerCase());
  await requireLicense(db, input.licenseId);
  await db.insert(licenseInvites).values({ licenseId: input.licenseId, email, sentBy: actor.id });
  await licenseAudit(db, actor, 'license.seat_assigned', input.licenseId, { email });
  return email;
}

// ---------------------------------------------------------------- rattachement (FR-006)

/** Une personne saisit une clé dans son espace : la licence sans titulaire rejoint son organisation. */
export async function claimLicenseByKey(
  db: Database,
  actor: Actor,
  input: { key: string; organizationId: string },
): Promise<string> {
  const [row] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.keyHash, licenseKeyHash(input.key)))
    .limit(1);
  if (!row || row.status === 'revoked') throw new LicenseError('KEY_UNKNOWN');
  if (row.organizationId === input.organizationId) return row.id;
  if (row.organizationId) throw new LicenseError('ALREADY_CLAIMED');
  await db
    .update(licenses)
    .set({ organizationId: input.organizationId, customerName: await organizationName(db, input.organizationId) })
    .where(and(eq(licenses.id, row.id), isNull(licenses.organizationId)));
  await licenseAudit(db, actor, 'license.claimed', row.id, { by: 'key' });
  return row.id;
}

/** Licences adressées à ce courriel (vérifié) et sans titulaire : rattachées à son organisation. */
export async function claimLicensesForEmail(db: Database, actor: Actor, email: string) {
  const address = email.trim().toLowerCase();
  const pending = await db
    .select({ id: licenses.id })
    .from(licenses)
    .where(and(eq(licenses.recipientEmail, address), isNull(licenses.organizationId), ne(licenses.status, 'revoked')));
  if (!pending.length) return 0;
  const organizationId = await organizationForEmail(db, address);
  if (!organizationId) return 0;
  const name = await organizationName(db, organizationId);
  for (const { id } of pending) {
    await db
      .update(licenses)
      .set({ organizationId, customerName: name })
      .where(and(eq(licenses.id, id), isNull(licenses.organizationId)));
    await licenseAudit(db, actor, 'license.claimed', id, { by: 'email' });
  }
  return pending.length;
}

// ---------------------------------------------------------------- lecture

export interface LicenseView {
  readonly id: string;
  readonly productSlug: string;
  readonly productName: string;
  readonly editionId: string;
  readonly editionCode: string;
  readonly editionName: LocalizedText;
  readonly licenseTypeId: string | null;
  readonly typeName: LocalizedText;
  readonly nature: LicenseTypeNature;
  readonly days: number;
  readonly pricePerSeat: number;
  readonly amount: number;
  readonly channel: LicenseChannel;
  readonly reason: string | null;
  readonly reference: string | null;
  readonly seats: number;
  readonly status: 'active' | 'revoked';
  readonly organizationId: string | null;
  readonly customerName: string;
  readonly recipientEmail: string | null;
  readonly batchId: string | null;
  readonly batchLabel: string | null;
  /** Clé en clair ; `null` si elle ne peut plus être déchiffrée (secret changé). */
  readonly key: string | null;
  readonly startsOnActivation: boolean;
  /** `null` : la validité démarre à la première activation. */
  readonly startsAt: string | null;
  readonly expiresAt: string | null;
  readonly createdAt: string;
  readonly createdBy: string | null;
  readonly createdByName: string | null;
  readonly revokedAt: string | null;
  readonly activations: readonly {
    id: string;
    deviceId: string;
    deviceName: string | null;
    activatedAt: string;
    lastRefreshAt: string;
  }[];
  /** Ordinateurs activés au moins une fois (libérés compris). */
  readonly everActivated: boolean;
  readonly invites: readonly { email: string; sentAt: string }[];
}

type BaseRow = {
  license: LicenseRow;
  product: { slug: string; name: string };
  edition: { code: string; name: LocalizedText };
  batchLabel: string | null;
};

async function viewsOf(deps: LicenseDependencies, rows: BaseRow[]): Promise<LicenseView[]> {
  const { db } = deps;
  const ids = rows.map((row) => row.license.id);
  const creators = [...new Set(rows.map((row) => row.license.createdBy).filter((id): id is string => Boolean(id)))];
  const [activations, invites, names] = ids.length
    ? await Promise.all([
        db
          .select()
          .from(licenseActivations)
          .where(inArray(licenseActivations.licenseId, ids))
          .orderBy(asc(licenseActivations.activatedAt)),
        db
          .select()
          .from(licenseInvites)
          .where(inArray(licenseInvites.licenseId, ids))
          .orderBy(desc(licenseInvites.sentAt)),
        creators.length
          ? db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, creators))
          : Promise.resolve([]),
      ])
    : [[], [], []];
  const nameOf = new Map(names.map((row) => [row.id, row.name]));
  return rows.map(({ license, product, edition, batchLabel }): LicenseView => {
    const mine = activations.filter((row) => row.licenseId === license.id);
    return {
      id: license.id,
      productSlug: product.slug,
      productName: product.name,
      editionId: license.editionId,
      editionCode: edition.code,
      editionName: edition.name,
      licenseTypeId: license.licenseTypeId,
      typeName: license.typeName,
      nature: license.nature,
      days: license.days,
      pricePerSeat: license.pricePerSeat,
      amount: license.amount,
      channel: license.channel,
      reason: license.reason,
      reference: license.reference,
      seats: license.seats,
      status: license.status,
      organizationId: license.organizationId,
      customerName: license.customerName,
      recipientEmail: license.recipientEmail,
      batchId: license.batchId,
      batchLabel,
      key: decryptLicenseKey(license.keyCipher, deps.secret),
      startsOnActivation: license.startsOnActivation,
      startsAt: license.startsAt?.toISOString() ?? null,
      expiresAt: license.expiresAt?.toISOString() ?? null,
      createdAt: license.createdAt.toISOString(),
      createdBy: license.createdBy,
      createdByName: license.createdBy ? (nameOf.get(license.createdBy) ?? null) : null,
      revokedAt: license.revokedAt?.toISOString() ?? null,
      activations: mine
        .filter((row) => !row.releasedAt)
        .map((row) => ({
          id: row.id,
          deviceId: row.deviceId,
          deviceName: row.deviceName,
          activatedAt: row.activatedAt.toISOString(),
          lastRefreshAt: row.lastRefreshAt.toISOString(),
        })),
      everActivated: mine.length > 0,
      invites: invites
        .filter((row) => row.licenseId === license.id)
        .map((row) => ({ email: row.email, sentAt: row.sentAt.toISOString() })),
    };
  });
}

const baseSelect = (db: Database) =>
  db
    .select({
      license: licenses,
      product: { slug: products.slug, name: products.name },
      edition: { code: editions.code, name: editions.name },
      batchLabel: licenseBatches.label,
    })
    .from(licenses)
    .innerJoin(products, eq(licenses.productId, products.id))
    .innerJoin(editions, eq(licenses.editionId, editions.id))
    .leftJoin(licenseBatches, eq(licenses.batchId, licenseBatches.id));

/** Licences des organisations d'une personne (espace client), les plus récentes d'abord. */
export async function listLicensesForOrganizations(deps: LicenseDependencies, organizationIds: readonly string[]) {
  if (!organizationIds.length) return [];
  const rows = await baseSelect(deps.db)
    .where(inArray(licenses.organizationId, [...organizationIds]))
    .orderBy(desc(licenses.createdAt));
  return viewsOf(deps, rows);
}

export async function getLicense(deps: LicenseDependencies, licenseId: string) {
  const rows = await baseSelect(deps.db).where(eq(licenses.id, licenseId)).limit(1);
  return (await viewsOf(deps, rows))[0] ?? null;
}

export async function getLicensesByIds(deps: LicenseDependencies, ids: readonly string[]) {
  if (!ids.length) return [];
  const rows = await baseSelect(deps.db)
    .where(inArray(licenses.id, [...ids]))
    .orderBy(desc(licenses.createdAt));
  return viewsOf(deps, rows);
}

export const LicenseFilters = z.strictObject({
  query: z.string().trim().max(120).optional(),
  view: z.enum(LICENSE_VIEWS).default('all'),
  editionId: z.uuid().optional(),
  channel: z.enum(CHANNELS).optional(),
  batchId: z.uuid().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

const everActivated = (db: Database) =>
  db
    .select({ one: sql`1` })
    .from(licenseActivations)
    .where(eq(licenseActivations.licenseId, licenses.id));

function viewCondition(db: Database, view: LicenseViewName, now: Date): SQL | undefined {
  switch (view) {
    case 'all':
      return undefined;
    case 'expiring':
      return and(
        eq(licenses.status, 'active'),
        isNotNull(licenses.expiresAt),
        gt(licenses.expiresAt, now),
        lte(licenses.expiresAt, new Date(now.getTime() + 30 * DAY)),
      );
    case 'purchased':
      return eq(licenses.channel, 'purchase');
    case 'offered':
      return and(eq(licenses.amount, 0), ne(licenses.channel, 'trial'), ne(licenses.channel, 'purchase'));
    case 'trials':
      return eq(licenses.channel, 'trial');
    case 'waiting':
      return and(eq(licenses.status, 'active'), notExists(everActivated(db)));
    case 'revoked':
      return eq(licenses.status, 'revoked');
  }
}

function queryCondition(db: Database, query: string | undefined): SQL | undefined {
  const needle = query?.trim();
  if (!needle) return undefined;
  const pattern = `%${needle.replace(/[\\%_]/gu, (character) => `\\${character}`)}%`;
  const memberOrgs = db
    .select({ id: member.organizationId })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(ilike(user.email, pattern));
  return or(
    eq(licenses.keyHash, licenseKeyHash(needle)),
    eq(licenses.id, needle),
    ilike(licenses.customerName, pattern),
    ilike(licenses.recipientEmail, pattern),
    ilike(licenses.reference, pattern),
    inArray(licenses.organizationId, memberOrgs),
  );
}

/** Recherche de l'équipe : vues, filtres, recherche libre ; rend aussi le compte de chaque vue. */
export async function findLicenses(deps: LicenseDependencies, input: z.input<typeof LicenseFilters> = {}) {
  const filters = LicenseFilters.parse(input);
  const { db } = deps;
  const now = new Date();
  const base = and(
    filters.editionId ? eq(licenses.editionId, filters.editionId) : undefined,
    filters.channel ? eq(licenses.channel, filters.channel) : undefined,
    filters.batchId ? eq(licenses.batchId, filters.batchId) : undefined,
    queryCondition(db, filters.query),
  );
  const where = and(base, viewCondition(db, filters.view, now));
  const [rows, [{ total } = { total: 0 }], counts] = await Promise.all([
    baseSelect(db).where(where).orderBy(desc(licenses.createdAt)).limit(filters.limit).offset(filters.offset),
    db.select({ total: count() }).from(licenses).where(where),
    Promise.all(
      LICENSE_VIEWS.map(async (view) => {
        const [{ n } = { n: 0 }] = await db
          .select({ n: count() })
          .from(licenses)
          .where(and(base, viewCondition(db, view, now)));
        return [view, n] as const;
      }),
    ),
  ]);
  return {
    items: await viewsOf(deps, rows),
    total,
    counts: Object.fromEntries(counts) as Record<LicenseViewName, number>,
  };
}

/** Journal d'une licence (émission, activations, libérations…), le plus récent d'abord. */
export async function licenseJournal(db: Database, licenseId: string) {
  const rows = await db
    .select({ event: auditEvents, actorName: user.name })
    .from(auditEvents)
    .leftJoin(user, eq(auditEvents.actorId, user.id))
    .where(and(eq(auditEvents.resourceType, 'license'), eq(auditEvents.resourceId, licenseId)))
    .orderBy(desc(auditEvents.occurredAt))
    .limit(100);
  return rows.map(({ event, actorName }) => ({
    action: event.action,
    actorType: event.actorType,
    actorName,
    occurredAt: event.occurredAt.toISOString(),
    details: event.details,
  }));
}

/** Organisation d'une personne pour une licence : son entreprise si elle en a une, sinon la personnelle. */
export async function organizationForEmail(db: Database, email: string) {
  const rows = await db
    .select({
      id: organization.id,
      metadata: organization.metadata,
      role: member.role,
      createdAt: organization.createdAt,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(user.email, email.trim().toLowerCase()));
  const owned = rows.filter((row) => row.role === 'owner');
  const company = owned
    .filter((row) => kindOf(row.metadata) === 'company')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  return (company ?? owned.find((row) => kindOf(row.metadata) === 'personal'))?.id ?? null;
}

/** Existe-t-il au moins une activation ? (utilisé par les statistiques) */
export const hasActivation = (db: Database) => exists(everActivated(db));

export type { CatalogEdition };

/** Licences émises par type de licence (console : colonne « Émises »). */
export async function licenseCountsByType(db: Database, typeIds: readonly string[]) {
  if (!typeIds.length) return {} as Record<string, number>;
  const rows = await db
    .select({ id: licenses.licenseTypeId, n: count() })
    .from(licenses)
    .where(inArray(licenses.licenseTypeId, [...typeIds]))
    .groupBy(licenses.licenseTypeId);
  return Object.fromEntries(rows.map((row) => [row.id ?? '', row.n])) as Record<string, number>;
}
