import { randomBytes } from 'node:crypto';
import {
  auditEvents,
  editions,
  licenseActivations,
  licenseInvites,
  licenses,
  member,
  organization,
  products,
  user,
  type Database,
  type LicenseRow,
} from '@kya-em/db';
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { recordAuditEvent } from '../audit/recordAuditEvent.ts';
import { DURATIONS, getCatalogProduct, type Actor, type CatalogEdition, type Duration } from '../catalog/catalog.ts';
import { kindOf } from '../accounts/organizations.ts';
import {
  decryptLicenseKey,
  encryptLicenseKey,
  generateLicenseKey,
  licenseKeyHash,
  type LicensePayload,
  type LicenseSigner,
} from './crypto.ts';

/**
 * Licences (spec 005). Les droits (fonctions, limites, filigrane, délai de grâce) sont lus dans le
 * catalogue à chaque jeton : changer une édition atteint les licences au prochain rafraîchissement.
 */

/** Codes de formule et durées en jours attendus par KYA-SolDesign (`EditionPlan`). */
export const PLAN_CODES: Record<Duration, { code: string; days: number }> = {
  P1D: { code: '1d', days: 1 },
  P1W: { code: '1w', days: 7 },
  P1M: { code: '1m', days: 30 },
  P3M: { code: '3m', days: 91 },
  P6M: { code: '6m', days: 182 },
  P1Y: { code: '12m', days: 365 },
};

/** Au-delà, le poste doit se reconnecter pour rafraîchir sa licence (contrat KYA-SolDesign). */
export const OFFLINE_DAYS = 30;
const DAY = 86_400_000;

const EDITION_PREFIX: Record<string, string> = { commercial: 'COM', academic: 'ACA', student: 'ETU' };
const prefixOf = (code: string) => EDITION_PREFIX[code] ?? code.slice(0, 3).toUpperCase();

export type ActivateError = 'KEY_UNKNOWN' | 'SEATS_EXHAUSTED';
export type RefreshError = 'LICENSE_UNKNOWN' | 'LICENSE_REVOKED' | 'DEVICE_RELEASED';

export class LicenseError extends Error {
  constructor(
    readonly code:
      | 'PRODUCT_NOT_FOUND'
      | 'EDITION_NOT_FOUND'
      | 'INVALID_DURATION'
      | 'ORGANIZATION_NOT_FOUND'
      | 'LICENSE_NOT_FOUND'
      | 'SEATS_BELOW_ACTIVE'
      | 'TOO_MANY_SEATS',
  ) {
    super(code);
  }
}

export interface LicenseDependencies {
  readonly db: Database;
  /** Secret du serveur : chiffrement des clés au repos. */
  readonly secret: string;
}

const newLicenseId = () => `lic_${randomBytes(9).toString('base64url').replace(/[-_]/gu, 'x')}`;

async function editionFor(db: Database, productSlug: string, editionCode: string) {
  const product = await getCatalogProduct(db, productSlug);
  if (!product) throw new LicenseError('PRODUCT_NOT_FOUND');
  const edition = product.editions.find((item) => item.code === editionCode);
  if (!edition) throw new LicenseError('EDITION_NOT_FOUND');
  return { product, edition };
}

const audit = (db: Database, actor: Actor, action: string, licenseId: string, details: Record<string, unknown> = {}) =>
  recordAuditEvent(db, {
    actorType: actor.type,
    actorId: actor.id,
    action,
    resourceType: 'license',
    resourceId: licenseId,
    outcome: 'success',
    details,
  });

/** Nom affiché dans le logiciel : l'organisation d'entreprise, sinon la personne. */
async function customerNameOf(db: Database, organizationId: string) {
  const [row] = await db.select().from(organization).where(eq(organization.id, organizationId)).limit(1);
  if (!row) throw new LicenseError('ORGANIZATION_NOT_FOUND');
  return row.name;
}

export const IssueInput = z.strictObject({
  productSlug: z.string().min(1),
  editionCode: z.string().min(1),
  duration: z.enum(DURATIONS),
  seats: z.number().int().min(1).max(10_000),
  organizationId: z.string().min(1),
  source: z.enum(['manual', 'purchase', 'trial']),
  startsAt: z.date().optional(),
});

/** Émet une licence et rend sa clé (seule occasion de la connaître sans la déchiffrer). */
export async function issueLicense(deps: LicenseDependencies, actor: Actor, input: z.input<typeof IssueInput>) {
  const values = IssueInput.parse(input);
  const { db } = deps;
  const { product, edition } = await editionFor(db, values.productSlug, values.editionCode);
  if (edition.maxSeats !== null && values.seats > edition.maxSeats) throw new LicenseError('TOO_MANY_SEATS');
  const plan = PLAN_CODES[values.duration];
  const key = generateLicenseKey(prefixOf(edition.code), plan.code);
  const startsAt = values.startsAt ?? new Date();
  const [row] = await db
    .insert(licenses)
    .values({
      id: newLicenseId(),
      productId: product.id,
      editionId: edition.id,
      duration: values.duration,
      seats: values.seats,
      organizationId: values.organizationId,
      customerName: await customerNameOf(db, values.organizationId),
      keyHash: licenseKeyHash(key),
      keyCipher: encryptLicenseKey(key, deps.secret),
      source: values.source,
      startsAt,
      expiresAt: new Date(startsAt.getTime() + plan.days * DAY),
      createdBy: actor.id,
    })
    .returning();
  await audit(db, actor, 'license.issued', row!.id, {
    product: product.slug,
    edition: edition.code,
    duration: values.duration,
    seats: values.seats,
    source: values.source,
  });
  return { license: row!, key };
}

// ---------------------------------------------------------------- logiciel : jetons

async function licenseWithEdition(db: Database, where: ReturnType<typeof eq>) {
  const [row] = await db
    .select({ license: licenses, productSlug: products.slug, editionCode: editions.code })
    .from(licenses)
    .innerJoin(products, eq(licenses.productId, products.id))
    .innerJoin(editions, eq(licenses.editionId, editions.id))
    .where(where)
    .limit(1);
  return row ?? null;
}

async function issueToken(
  db: Database,
  signer: LicenseSigner,
  row: { license: LicenseRow; productSlug: string; editionCode: string },
  deviceId: string,
) {
  const { edition } = await editionFor(db, row.productSlug, row.editionCode);
  const plan = PLAN_CODES[row.license.duration as Duration] ?? { code: row.license.duration, days: 0 };
  const payload: LicensePayload = {
    licenseId: row.license.id,
    customer: row.license.customerName,
    edition: edition.code,
    plan: plan.code,
    features: edition.features,
    limits: { maxProjects: edition.maxProjects, seats: row.license.seats },
    watermark: edition.watermark ? edition.code : null,
    deviceId,
    issuedAt: new Date().toISOString(),
    startsAt: row.license.startsAt.toISOString(),
    expiresAt: row.license.expiresAt.toISOString(),
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
 * consommer ; sinon un poste libre est pris, sous verrou (deux activations simultanées sur le
 * dernier poste : une seule passe).
 */
export async function activateLicense(
  deps: LicenseDependencies & { signer: LicenseSigner },
  input: { key: string; deviceId: string; deviceName?: string },
): Promise<{ token: string } | { error: ActivateError }> {
  const device = DeviceInput.safeParse(input);
  if (!device.success || typeof input.key !== 'string' || input.key.length > 64) return { error: 'KEY_UNKNOWN' };
  const { db } = deps;
  const found = await licenseWithEdition(db, eq(licenses.keyHash, licenseKeyHash(input.key)));
  if (!found || found.license.status === 'revoked') return { error: 'KEY_UNKNOWN' };

  const outcome = await db.transaction(async (tx) => {
    // Verrou sur la licence : le décompte des postes et l'activation se font d'un seul tenant.
    await tx.select({ id: licenses.id }).from(licenses).where(eq(licenses.id, found.license.id)).for('update');
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
    await audit(db, { type: 'system', id: null }, 'license.activated', found.license.id, {
      device: device.data.deviceId.slice(0, 8),
    });
  }
  return { token: await issueToken(db, deps.signer, found, device.data.deviceId) };
}

/** Rafraîchissement (`POST /licenses/{id}/refresh`) : droits et dates du moment. */
export async function refreshLicense(
  deps: LicenseDependencies & { signer: LicenseSigner },
  input: { licenseId: string; deviceId: string },
): Promise<{ token: string } | { error: RefreshError }> {
  const { db } = deps;
  if (typeof input.licenseId !== 'string' || typeof input.deviceId !== 'string') return { error: 'LICENSE_UNKNOWN' };
  const found = await licenseWithEdition(db, eq(licenses.id, input.licenseId));
  if (!found) return { error: 'LICENSE_UNKNOWN' };
  if (found.license.status === 'revoked') return { error: 'LICENSE_REVOKED' };
  const [activation] = await db
    .select()
    .from(licenseActivations)
    .where(and(eq(licenseActivations.licenseId, input.licenseId), eq(licenseActivations.deviceId, input.deviceId)))
    .limit(1);
  if (!activation) return { error: 'LICENSE_UNKNOWN' };
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
    await audit(db, { type: 'software', id: null }, 'license.seat_released', input.licenseId, { by: 'device' });
  }
}

/** Offre du logiciel au format `EditionDescriptor` de KYA-SolDesign (`GET /products/{slug}/editions`). */
export async function editionDescriptors(db: Database, productSlug: string) {
  const product = await getCatalogProduct(db, productSlug, { publicOnly: true });
  if (!product) return null;
  return product.editions.map((edition) => ({
    edition: edition.code,
    features: edition.features,
    limits: { maxProjects: edition.maxProjects, seats: edition.maxSeats ?? 1 },
    watermark: edition.watermark ? edition.code : null,
    graceDays: edition.graceDays,
    plans: edition.plans.map((plan) => {
      const code = PLAN_CODES[plan.duration as Duration] ?? { code: plan.duration, days: 0 };
      return { edition: edition.code, plan: code.code, days: code.days };
    }),
  }));
}

// ---------------------------------------------------------------- équipe et client : gestion

async function requireLicense(db: Database, licenseId: string) {
  const [row] = await db.select().from(licenses).where(eq(licenses.id, licenseId)).limit(1);
  if (!row) throw new LicenseError('LICENSE_NOT_FOUND');
  return row;
}

/** Libère un poste depuis l'espace client ou l'administration : effectif au prochain rafraîchissement. */
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
  if (released.length) await audit(db, actor, 'license.seat_released', input.licenseId, { by: actor.type });
  return released.length > 0;
}

export async function extendLicense(db: Database, actor: Actor, input: { licenseId: string; expiresAt: Date }) {
  const row = await requireLicense(db, input.licenseId);
  await db.update(licenses).set({ expiresAt: input.expiresAt }).where(eq(licenses.id, row.id));
  await audit(db, actor, 'license.extended', row.id, {
    from: row.expiresAt.toISOString(),
    to: input.expiresAt.toISOString(),
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
  await audit(db, actor, 'license.seats_changed', row.id, { from: row.seats, to: input.seats });
}

export async function revokeLicense(db: Database, actor: Actor, input: { licenseId: string }) {
  const row = await requireLicense(db, input.licenseId);
  if (row.status === 'revoked') return;
  await db
    .update(licenses)
    .set({ status: 'revoked', revokedAt: new Date(), revokedBy: actor.id })
    .where(eq(licenses.id, row.id));
  await audit(db, actor, 'license.revoked', row.id);
}

export async function recordSeatInvite(db: Database, actor: Actor, input: { licenseId: string; email: string }) {
  const email = z.email().parse(input.email.trim().toLowerCase());
  await requireLicense(db, input.licenseId);
  await db.insert(licenseInvites).values({ licenseId: input.licenseId, email, sentBy: actor.id });
  await audit(db, actor, 'license.seat_assigned', input.licenseId, { email });
  return email;
}

export interface LicenseView {
  readonly id: string;
  readonly productSlug: string;
  readonly productName: string;
  readonly editionCode: string;
  readonly editionName: { fr: string; en?: string };
  readonly duration: string;
  readonly seats: number;
  readonly status: 'active' | 'revoked';
  readonly source: string;
  readonly organizationId: string;
  readonly customerName: string;
  /** Clé en clair ; `null` si elle ne peut plus être déchiffrée (secret changé). */
  readonly key: string | null;
  readonly startsAt: string;
  readonly expiresAt: string;
  readonly createdAt: string;
  readonly activations: readonly {
    id: string;
    deviceId: string;
    deviceName: string | null;
    activatedAt: string;
    lastRefreshAt: string;
  }[];
  readonly invites: readonly { email: string; sentAt: string }[];
}

async function viewsOf(
  deps: LicenseDependencies,
  rows: {
    license: LicenseRow;
    product: { slug: string; name: string };
    edition: { code: string; name: { fr: string; en?: string } };
  }[],
) {
  const { db } = deps;
  const ids = rows.map((row) => row.license.id);
  const [activations, invites] = ids.length
    ? await Promise.all([
        db
          .select()
          .from(licenseActivations)
          .where(and(inArray(licenseActivations.licenseId, ids), isNull(licenseActivations.releasedAt)))
          .orderBy(asc(licenseActivations.activatedAt)),
        db
          .select()
          .from(licenseInvites)
          .where(inArray(licenseInvites.licenseId, ids))
          .orderBy(desc(licenseInvites.sentAt)),
      ])
    : [[], []];
  return rows.map(({ license, product, edition }): LicenseView => ({
    id: license.id,
    productSlug: product.slug,
    productName: product.name,
    editionCode: edition.code,
    editionName: edition.name,
    duration: license.duration,
    seats: license.seats,
    status: license.status,
    source: license.source,
    organizationId: license.organizationId,
    customerName: license.customerName,
    key: decryptLicenseKey(license.keyCipher, deps.secret),
    startsAt: license.startsAt.toISOString(),
    expiresAt: license.expiresAt.toISOString(),
    createdAt: license.createdAt.toISOString(),
    activations: activations
      .filter((row) => row.licenseId === license.id)
      .map((row) => ({
        id: row.id,
        deviceId: row.deviceId,
        deviceName: row.deviceName,
        activatedAt: row.activatedAt.toISOString(),
        lastRefreshAt: row.lastRefreshAt.toISOString(),
      })),
    invites: invites
      .filter((row) => row.licenseId === license.id)
      .map((row) => ({ email: row.email, sentAt: row.sentAt.toISOString() })),
  }));
}

const baseSelect = (db: Database) =>
  db
    .select({
      license: licenses,
      product: { slug: products.slug, name: products.name },
      edition: { code: editions.code, name: editions.name },
    })
    .from(licenses)
    .innerJoin(products, eq(licenses.productId, products.id))
    .innerJoin(editions, eq(licenses.editionId, editions.id));

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

/** Recherche de l'équipe : clé exacte, identifiant, client ou courriel d'un membre de l'organisation. */
export async function findLicenses(deps: LicenseDependencies, query: string) {
  const needle = query.trim();
  const { db } = deps;
  let rows;
  if (!needle) {
    rows = await baseSelect(db).orderBy(desc(licenses.createdAt)).limit(50);
  } else {
    const pattern = `%${needle.replace(/[\\%_]/gu, (character) => `\\${character}`)}%`;
    const memberOrgs = db
      .select({ id: member.organizationId })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(ilike(user.email, pattern));
    rows = await baseSelect(db)
      .where(
        or(
          eq(licenses.keyHash, licenseKeyHash(needle)),
          eq(licenses.id, needle),
          ilike(licenses.customerName, pattern),
          inArray(licenses.organizationId, memberOrgs),
        ),
      )
      .orderBy(desc(licenses.createdAt))
      .limit(50);
  }
  return viewsOf(deps, rows);
}

/** Journal d'une licence (émission, activations, libérations…), le plus récent d'abord. */
export async function licenseJournal(db: Database, licenseId: string) {
  const rows = await db
    .select()
    .from(auditEvents)
    .where(and(eq(auditEvents.resourceType, 'license'), eq(auditEvents.resourceId, licenseId)))
    .orderBy(desc(auditEvents.occurredAt))
    .limit(100);
  return rows.map((row) => ({
    action: row.action,
    actorType: row.actorType,
    occurredAt: row.occurredAt.toISOString(),
    details: row.details,
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

export type { CatalogEdition };
