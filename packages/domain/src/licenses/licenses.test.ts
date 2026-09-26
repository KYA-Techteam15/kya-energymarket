import { auditEvents, user, type Database } from '@kya-em/db';
import { createTestDatabase } from '@kya-em/db/testing';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensurePersonalOrganization } from '../accounts/organizations.ts';
import { setPlan, upsertEdition } from '../catalog/catalog.ts';
import { seedInitialContent } from '../seed/pages.ts';
import {
  createLicenseSigner,
  decryptLicenseKey,
  encryptLicenseKey,
  generateSigningKey,
  licenseKeyHash,
  type LicenseSigner,
} from './crypto.ts';
import {
  activateLicense,
  editionDescriptors,
  extendLicense,
  findLicenses,
  getLicense,
  issueLicense,
  LicenseError,
  listLicensesForOrganizations,
  refreshLicense,
  releaseDevice,
  releaseSeat,
  revokeLicense,
  setLicenseSeats,
} from './licenses.ts';

// ---------------------------------------------------------------- vérification du logiciel
// Copie fidèle de `verifyLicense` de KYA-SolDesign (apps/desktop/src/app/licensing/token.ts, 1.2.1) :
// le test de contrat vérifie que la plateforme émet des jetons que le logiciel accepte.
const FEATURES = [
  'system.aio',
  'sizing.optimize',
  'documents.word',
  'documents.pricing',
  'lifecycle.issue',
  'catalog.userEquipment',
];
function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replace(/-/gu, '+').replace(/_/gu, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
async function softwareVerify(token: string, publicJwk: JsonWebKey) {
  const key = await crypto.subtle.importKey('jwk', publicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'verify',
  ]);
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  let valid: boolean;
  try {
    valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      fromBase64Url(signature),
      new TextEncoder().encode(body),
    );
  } catch {
    return null;
  }
  if (!valid) return null;
  const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
  if (
    !['commercial', 'academic', 'student'].includes(payload.edition) ||
    !Array.isArray(payload.features) ||
    !payload.features.every((f: string) => FEATURES.includes(f))
  )
    return null;
  if (Number.isNaN(Date.parse(payload.expiresAt)) || Number.isNaN(Date.parse(payload.startsAt))) return null;
  return payload;
}

let handle: Awaited<ReturnType<typeof createTestDatabase>>;
let db: Database;
let signer: LicenseSigner;
let publicJwk: JsonWebKey;
let organizationId: string;
const SECRET = 'secret-de-test-long-de-plus-de-32-caracteres';
const staff = { type: 'kya_staff' as const, id: 'equipe-1' };
const deps = () => ({ db, secret: SECRET, signer });

beforeAll(async () => {
  handle = await createTestDatabase();
  db = handle.db;
  await seedInitialContent(db);
  const pair = await generateSigningKey();
  signer = await createLicenseSigner(pair.privateJwk);
  publicJwk = pair.publicJwk;
  await db.insert(user).values({
    id: 'user-afi',
    name: 'Afi Kodjo',
    email: 'afi@exemple.tg',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  organizationId = await ensurePersonalOrganization(db, { id: 'user-afi', name: 'Afi Kodjo' });
});
afterAll(async () => {
  await handle.close();
});

const issue = (overrides: Partial<Parameters<typeof issueLicense>[2]> = {}) =>
  issueLicense({ db, secret: SECRET }, staff, {
    productSlug: 'kya-soldesign',
    editionCode: 'commercial',
    duration: 'P1Y',
    seats: 2,
    organizationId,
    source: 'manual',
    ...overrides,
  });

describe('clés de licence', () => {
  it('sont lisibles, chiffrées au repos et retrouvées par leur empreinte', async () => {
    const { key, license } = await issue();
    expect(key).toMatch(/^KYA-COM-12M-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/u);
    expect(license.keyCipher).not.toContain(key);
    expect(decryptLicenseKey(license.keyCipher, SECRET)).toBe(key);
    expect(decryptLicenseKey(license.keyCipher, 'un-autre-secret-de-plus-de-32-caracteres')).toBeNull();
    expect(licenseKeyHash(` ${key.toLowerCase()} `)).toBe(license.keyHash);
    expect(decryptLicenseKey(encryptLicenseKey('abc', SECRET), SECRET)).toBe('ABC');
  });
});

describe('contrat KYA-SolDesign', () => {
  it('émet un jeton que le logiciel vérifie, à la forme attendue', async () => {
    const { key, license } = await issue({ editionCode: 'academic', duration: 'P1Y', seats: 1 });
    const result = await activateLicense(deps(), { key, deviceId: 'poste-0001-aaaa' });
    expect('token' in result).toBe(true);
    const payload = await softwareVerify((result as { token: string }).token, publicJwk);
    expect(payload).toMatchObject({
      licenseId: license.id,
      customer: 'Afi Kodjo',
      edition: 'academic',
      plan: '12m',
      limits: { maxProjects: null, seats: 1 },
      watermark: 'academic',
      deviceId: 'poste-0001-aaaa',
      graceDays: 3,
      offlineDays: 30,
    });
    expect(payload.features).not.toContain('documents.pricing');
    expect(Object.keys(payload)).toEqual([
      'licenseId',
      'customer',
      'edition',
      'plan',
      'features',
      'limits',
      'watermark',
      'deviceId',
      'issuedAt',
      'startsAt',
      'expiresAt',
      'graceDays',
      'offlineDays',
    ]);
    // Un jeton altéré est refusé par le logiciel.
    const token = (result as { token: string }).token;
    expect(await softwareVerify(`${token.slice(0, -4)}AAAA`, publicJwk)).toBeNull();
  });

  it('décrit l’offre au format EditionDescriptor', async () => {
    const descriptors = await editionDescriptors(db, 'kya-soldesign');
    const student = descriptors?.find((item) => item.edition === 'student');
    expect(student).toMatchObject({
      features: ['system.aio'],
      limits: { maxProjects: 5, seats: 1 },
      watermark: 'student',
      graceDays: 0,
    });
    expect(student?.plans).toEqual([
      { edition: 'student', plan: '1d', days: 1 },
      { edition: 'student', plan: '1m', days: 30 },
    ]);
  });
});

describe('postes', () => {
  it('réactive sans consommer, refuse au-delà des postes, libère et réactive', async () => {
    const { key, license } = await issue({ seats: 2 });
    expect('token' in (await activateLicense(deps(), { key, deviceId: 'poste-a-000001' }))).toBe(true);
    expect('token' in (await activateLicense(deps(), { key, deviceId: 'poste-a-000001' }))).toBe(true);
    expect('token' in (await activateLicense(deps(), { key: key.toLowerCase(), deviceId: 'poste-b-000002' }))).toBe(
      true,
    );
    expect(await activateLicense(deps(), { key, deviceId: 'poste-c-000003' })).toEqual({ error: 'SEATS_EXHAUSTED' });

    await releaseDevice(db, { licenseId: license.id, deviceId: 'poste-b-000002' });
    expect(await refreshLicense(deps(), { licenseId: license.id, deviceId: 'poste-b-000002' })).toEqual({
      error: 'DEVICE_RELEASED',
    });
    expect('token' in (await activateLicense(deps(), { key, deviceId: 'poste-c-000003' }))).toBe(true);
    const view = await getLicense({ db, secret: SECRET }, license.id);
    expect(view?.activations.map((row) => row.deviceId).sort()).toEqual(['poste-a-000001', 'poste-c-000003']);
  });

  it('n’accorde jamais plus de postes que prévu, même en rafale', async () => {
    const { key, license } = await issue({ seats: 3 });
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) => activateLicense(deps(), { key, deviceId: `rafale-${index}-000000` })),
    );
    expect(results.filter((result) => 'token' in result)).toHaveLength(3);
    expect(results.filter((result) => 'error' in result && result.error === 'SEATS_EXHAUSTED')).toHaveLength(5);
    expect((await getLicense({ db, secret: SECRET }, license.id))?.activations).toHaveLength(3);
  });

  it('libère un poste depuis l’espace client : refusé au prochain rafraîchissement', async () => {
    const { key, license } = await issue({ seats: 1 });
    await activateLicense(deps(), { key, deviceId: 'poste-client-01' });
    const [activation] = (await getLicense({ db, secret: SECRET }, license.id))!.activations;
    expect(
      await releaseSeat(db, { type: 'user', id: 'user-afi' }, { licenseId: license.id, activationId: activation!.id }),
    ).toBe(true);
    expect(await refreshLicense(deps(), { licenseId: license.id, deviceId: 'poste-client-01' })).toEqual({
      error: 'DEVICE_RELEASED',
    });
    await expect(setLicenseSeats(db, staff, { licenseId: license.id, seats: 2 })).resolves.toBeUndefined();
  });
});

describe('rafraîchissement', () => {
  it('rend les droits et dates du moment ; refuse une licence révoquée ou inconnue', async () => {
    const { key, license } = await issue({ editionCode: 'student', duration: 'P1M', seats: 1 });
    await activateLicense(deps(), { key, deviceId: 'poste-etudiant-1' });
    await upsertEdition(db, staff, 'kya-soldesign', 'student', {
      features: ['system.aio', 'documents.word'],
      maxProjects: 8,
    });
    const later = new Date(Date.now() + 90 * 86_400_000);
    await extendLicense(db, staff, { licenseId: license.id, expiresAt: later });
    const refreshed = await refreshLicense(deps(), { licenseId: license.id, deviceId: 'poste-etudiant-1' });
    const payload = await softwareVerify((refreshed as { token: string }).token, publicJwk);
    expect(payload.features).toEqual(['system.aio', 'documents.word']);
    expect(payload.limits.maxProjects).toBe(8);
    expect(payload.expiresAt).toBe(later.toISOString());

    await revokeLicense(db, staff, { licenseId: license.id });
    expect(await refreshLicense(deps(), { licenseId: license.id, deviceId: 'poste-etudiant-1' })).toEqual({
      error: 'LICENSE_REVOKED',
    });
    expect(await activateLicense(deps(), { key, deviceId: 'poste-etudiant-2' })).toEqual({ error: 'KEY_UNKNOWN' });
    expect(await refreshLicense(deps(), { licenseId: 'lic_inconnue', deviceId: 'x' })).toEqual({
      error: 'LICENSE_UNKNOWN',
    });
    expect(await activateLicense(deps(), { key: 'KYA-COM-12M-AAAA-BBBB-CCCC', deviceId: 'poste-inconnu-1' })).toEqual({
      error: 'KEY_UNKNOWN',
    });
  });

  it('refuse une édition au-delà de ses postes, et trace chaque étape', async () => {
    await setPlan(db, staff, 'kya-soldesign', 'student', 'P1M', { pricePerSeat: 7500 });
    await expect(issue({ editionCode: 'student', duration: 'P1M', seats: 2 })).rejects.toThrow(LicenseError);
    const actions = (await db.select().from(auditEvents).where(eq(auditEvents.resourceType, 'license'))).map(
      (row) => row.action,
    );
    for (const action of [
      'license.issued',
      'license.activated',
      'license.seat_released',
      'license.extended',
      'license.revoked',
    ]) {
      expect(actions).toContain(action);
    }
  });
});

describe('vues', () => {
  it('liste les licences d’une organisation et les retrouve par clé ou client', async () => {
    const { key } = await issue({ seats: 1 });
    const mine = await listLicensesForOrganizations({ db, secret: SECRET }, [organizationId]);
    expect(mine.some((view) => view.key === key)).toBe(true);
    expect((await findLicenses({ db, secret: SECRET }, key.toLowerCase()))[0]?.key).toBe(key);
    expect((await findLicenses({ db, secret: SECRET }, 'afi@exemple')).length).toBeGreaterThan(0);
  });
});
