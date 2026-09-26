import {
  extendLicense,
  extendLicenses,
  findLicenseHolders,
  findLicenses,
  getCatalogProduct,
  getLicense,
  issueLicense,
  licenseJournal,
  licenseKeysCsv,
  listJobs,
  listProducts,
  releaseSeat,
  resendLicenseKey,
  revokeLicense,
  revokeLicenses,
  setLicenseSeats,
  type IssueInputValue,
  type LicenseFilters,
} from '@kya-em/domain';
import type { z } from 'zod';
import { attempt, consoleStaff, FORBIDDEN } from '../console/access.server';

/** Licences dans la console (spec 005b, histoire 2 et 4) : droits `licenses:read|write|revoke`. */
const deps = (current: { db: Parameters<typeof getLicense>[0]['db']; secret: string }) => ({
  db: current.db,
  secret: current.secret,
});

/** Offre utilisable à l'émission : tous les types non archivés, masqués compris. */
async function issuableOffer(db: Parameters<typeof getCatalogProduct>[0]) {
  const products = await listProducts(db, { includeHidden: true });
  const offer = [];
  for (const summary of products) {
    const product = await getCatalogProduct(db, summary.slug);
    for (const edition of product?.editions ?? []) {
      if (edition.archived) continue;
      offer.push({
        productSlug: summary.slug,
        productName: summary.name,
        editionId: edition.id,
        editionCode: edition.code,
        editionName: edition.name,
        editionVisible: edition.visible,
        maxSeats: edition.maxSeats,
        types: edition.types
          .filter((type) => !type.archived)
          .map((type) => ({
            id: type.id,
            name: type.name,
            nature: type.nature,
            days: type.days,
            pricePerSeat: type.pricePerSeat,
            seatsMin: type.seatsMin,
            seatsMax: type.seatsMax ?? edition.maxSeats,
            visible: type.visible,
            forSale: type.forSale,
          })),
      });
    }
  }
  return offer;
}

export async function loadLicenses(filters: z.input<typeof LicenseFilters>) {
  const current = await consoleStaff('licenses', 'read');
  if (!current) return null;
  const [result, offer] = await Promise.all([findLicenses(deps(current), filters), issuableOffer(current.db)]);
  return {
    ...result,
    offer,
    can: { write: current.can('licenses', 'write'), revoke: current.can('licenses', 'revoke') },
  };
}

export async function loadLicenseDetail(licenseId: string) {
  const current = await consoleStaff('licenses', 'read');
  if (!current) return null;
  const license = await getLicense(deps(current), licenseId);
  if (!license) return null;
  const [journal, mails] = await Promise.all([
    licenseJournal(current.db, licenseId),
    listJobs(current.db, { references: [licenseId] }),
  ]);
  return {
    license,
    // Détails transmis en texte JSON (les valeurs libres ne se sérialisent pas telles quelles).
    journal: journal.map((entry) => ({ ...entry, details: JSON.stringify(entry.details) })),
    mails,
    can: { write: current.can('licenses', 'write'), revoke: current.can('licenses', 'revoke') },
  };
}

export async function searchHolders(query: string) {
  const current = await consoleStaff('licenses', 'write');
  if (!current) return [];
  return findLicenseHolders(current.db, query);
}

export async function issueFromConsole(input: IssueInputValue & { sendKey?: boolean }) {
  const current = await consoleStaff('licenses', 'write');
  if (!current) return FORBIDDEN;
  const { sendKey, ...values } = input;
  return attempt(async () => {
    const { license } = await issueLicense(deps(current), current.actor, values);
    if (sendKey && license.recipientEmail) await resendLicenseKey(current.db, { licenseId: license.id });
    return license.id;
  });
}

export async function extendFromConsole(input: { id: string; days?: number; expiresAt?: string; reason?: string }) {
  const current = await consoleStaff('licenses', 'write');
  if (!current) return FORBIDDEN;
  return attempt(async () => {
    await extendLicense(current.db, current.actor, {
      licenseId: input.id,
      days: input.days,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      reason: input.reason ?? null,
    });
    return null;
  });
}

export async function setSeatsFromConsole(input: { id: string; seats: number }) {
  const current = await consoleStaff('licenses', 'write');
  if (!current) return FORBIDDEN;
  return attempt(() =>
    setLicenseSeats(current.db, current.actor, { licenseId: input.id, seats: input.seats }).then(() => null),
  );
}

export async function releaseFromConsole(input: { id: string; activationId: string }) {
  const current = await consoleStaff('licenses', 'write');
  if (!current) return FORBIDDEN;
  return attempt(() =>
    releaseSeat(current.db, current.actor, { licenseId: input.id, activationId: input.activationId }).then(() => null),
  );
}

export async function revokeFromConsole(input: { id: string; reason: string }) {
  const current = await consoleStaff('licenses', 'revoke');
  if (!current) return FORBIDDEN;
  return attempt(() =>
    revokeLicense(current.db, current.actor, { licenseId: input.id, reason: input.reason }).then(() => null),
  );
}

export async function resendFromConsole(input: { id: string; email?: string }) {
  const current = await consoleStaff('licenses', 'write');
  if (!current) return FORBIDDEN;
  return attempt(() => resendLicenseKey(current.db, { licenseId: input.id, email: input.email }));
}

export async function bulkFromConsole(input: {
  ids: string[];
  action: 'extend' | 'revoke' | 'csv';
  days?: number;
  reason?: string;
}) {
  if (input.action === 'csv') {
    const current = await consoleStaff('licenses', 'read');
    if (!current) return FORBIDDEN;
    return attempt(() => licenseKeysCsv(deps(current), input.ids));
  }
  const current = await consoleStaff('licenses', input.action === 'revoke' ? 'revoke' : 'write');
  if (!current) return FORBIDDEN;
  return attempt(async () => {
    const count =
      input.action === 'extend'
        ? await extendLicenses(current.db, current.actor, { ids: input.ids, days: input.days ?? 30 })
        : await revokeLicenses(current.db, current.actor, { ids: input.ids, reason: input.reason });
    return String(count);
  });
}

/** Offre utilisable pour générer un lot (types masqués compris). */
export async function loadOffer() {
  const current = await consoleStaff('licenses', 'write');
  if (!current) return null;
  return issuableOffer(current.db);
}
