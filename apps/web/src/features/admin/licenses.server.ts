import { staffCan } from '@kya-em/auth';
import {
  extendLicense,
  findLicenses,
  getCatalogProduct,
  getLicense,
  issueLicense,
  LicenseError,
  licenseJournal,
  organizationForEmail,
  releaseSeat,
  revokeLicense,
  setLicenseSeats,
  type Actor,
  type Duration,
} from '@kya-em/domain';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { ZodError } from 'zod';
import { runtime } from '@/shared/server/runtime.server';

/** Administration des licences (spec 005, histoire 3) : droits `licenses:read|write|revoke`. */
async function staff(action: 'read' | 'write' | 'revoke') {
  const { auth, database, secret } = runtime();
  if (!auth || !database) return null;
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  const role = (session?.user as { role?: string | null } | undefined)?.role ?? null;
  if (!session || !staffCan(role, 'licenses', action)) return null;
  const actor: Actor = { type: 'kya_staff', id: session.user.id };
  return {
    db: database.db,
    secret,
    actor,
    can: { write: staffCan(role, 'licenses', 'write'), revoke: staffCan(role, 'licenses', 'revoke') },
  };
}

type Result<T = null> = { ok: true; value: T } | { ok: false; code: string };
const FORBIDDEN = { ok: false as const, code: 'FORBIDDEN' };

async function run<T>(action: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await action() };
  } catch (error) {
    if (error instanceof LicenseError) return { ok: false, code: error.code };
    if (error instanceof ZodError) return { ok: false, code: 'INVALID' };
    throw error;
  }
}

export async function loadLicensesAdmin(query: string) {
  const current = await staff('read');
  if (!current) return null;
  const product = await getCatalogProduct(current.db, 'kya-soldesign');
  return {
    licenses: await findLicenses({ db: current.db, secret: current.secret }, query),
    can: current.can,
    // Offre proposée à l'émission : éditions et durées du catalogue.
    offer:
      product?.editions.map((edition) => ({
        code: edition.code,
        name: edition.name,
        maxSeats: edition.maxSeats,
        durations: edition.plans.map((plan) => plan.duration),
      })) ?? [],
  };
}

export async function loadLicenseAdmin(licenseId: string) {
  const current = await staff('read');
  if (!current) return null;
  const license = await getLicense({ db: current.db, secret: current.secret }, licenseId);
  if (!license) return null;
  const journal = (await licenseJournal(current.db, licenseId)).map((entry) => ({
    ...entry,
    // Détails transmis en texte JSON (les valeurs libres ne se sérialisent pas telles quelles).
    details: JSON.stringify(entry.details),
  }));
  return { license, journal, can: current.can };
}

export async function issueLicenseAdmin(input: {
  email: string;
  editionCode: string;
  duration: string;
  seats: number;
}) {
  const current = await staff('write');
  if (!current) return FORBIDDEN;
  const organizationId = await organizationForEmail(current.db, input.email);
  if (!organizationId) return { ok: false as const, code: 'ACCOUNT_NOT_FOUND' };
  return run(async () => {
    const { license } = await issueLicense({ db: current.db, secret: current.secret }, current.actor, {
      productSlug: 'kya-soldesign',
      editionCode: input.editionCode,
      duration: input.duration as Duration,
      seats: input.seats,
      organizationId,
      source: 'manual',
    });
    return license.id;
  });
}

export async function extendLicenseAdmin(licenseId: string, expiresAt: string) {
  const current = await staff('write');
  if (!current) return FORBIDDEN;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return { ok: false as const, code: 'INVALID' };
  return run(() => extendLicense(current.db, current.actor, { licenseId, expiresAt: date }).then(() => null));
}

export async function setSeatsAdmin(licenseId: string, seats: number) {
  const current = await staff('write');
  if (!current) return FORBIDDEN;
  return run(() => setLicenseSeats(current.db, current.actor, { licenseId, seats }).then(() => null));
}

export async function releaseSeatAdmin(licenseId: string, activationId: string) {
  const current = await staff('write');
  if (!current) return FORBIDDEN;
  return run(() => releaseSeat(current.db, current.actor, { licenseId, activationId }).then(() => null));
}

export async function revokeLicenseAdmin(licenseId: string) {
  const current = await staff('revoke');
  if (!current) return FORBIDDEN;
  return run(() => revokeLicense(current.db, current.actor, { licenseId }).then(() => null));
}
