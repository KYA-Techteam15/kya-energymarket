import { auditEvents, jobs, licenses, user, type Database } from '@kya-em/db';
import { createTestDatabase } from '@kya-em/db/testing';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensurePersonalOrganization } from '../accounts/organizations.ts';
import { getCatalogProduct } from '../catalog/catalog.ts';
import { changeCatalog, getCatalogEditing, publishCatalog } from '../catalog/draft.ts';
import { runDueJobs } from '../jobs/jobs.ts';
import { seedInitialContent } from '../seed/pages.ts';
import { dashboardStats } from '../stats/stats.ts';
import {
  extendBatch,
  generateBatch,
  getBatch,
  licenseKeysCsv,
  listBatches,
  resendBatchMails,
  revokeBatch,
} from './batches.ts';
import {
  createLicenseSigner,
  decryptLicenseKey,
  encryptLicenseKey,
  generateSigningKey,
  licenseKeyHash,
  type LicenseSigner,
} from './crypto.ts';
import { findLicenseHolders } from './holders.ts';
import { startTrial, trialFollowUp, trialStatus } from './trials.ts';
import {
  activateLicense,
  claimLicenseByKey,
  claimLicensesForEmail,
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
  type IssueInputValue,
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
/** Types de licence de l'offre amorcée : `commercial:365`, `student:30`… */
const types = new Map<string, string>();

async function loadTypes() {
  const product = await getCatalogProduct(db, 'kya-soldesign');
  for (const edition of product!.editions) {
    for (const type of edition.types) types.set(`${edition.code}:${type.days}`, type.id);
  }
}

beforeAll(async () => {
  handle = await createTestDatabase();
  db = handle.db;
  await seedInitialContent(db);
  await loadTypes();
  const pair = await generateSigningKey();
  signer = await createLicenseSigner(pair.privateJwk);
  publicJwk = pair.publicJwk;
  const now = new Date();
  await db.insert(user).values([
    { id: 'user-afi', name: 'Afi Kodjo', email: 'afi@exemple.tg', emailVerified: true, createdAt: now, updatedAt: now },
    {
      id: 'user-kofi',
      name: 'Kofi Mensah',
      email: 'kofi@exemple.tg',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  organizationId = await ensurePersonalOrganization(db, { id: 'user-afi', name: 'Afi Kodjo' });
});
afterAll(async () => {
  await handle.close();
});

const issue = (overrides: Partial<IssueInputValue> & { type?: string } = {}) => {
  const { type = 'commercial:365', ...rest } = overrides;
  return issueLicense({ db, secret: SECRET }, staff, {
    licenseTypeId: types.get(type)!,
    seats: 2,
    organizationId,
    channel: 'staff',
    reason: 'test',
    ...rest,
  });
};

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

describe('émission (spec 005b, histoire 2)', () => {
  it('fige le type, la durée, le prix, le montant et le canal ; un prix publié ensuite n’y change rien', async () => {
    const { license } = await issue({ channel: 'purchase', amount: 440_000, reason: null, reference: 'CMD-1' });
    expect(license).toMatchObject({
      days: 365,
      pricePerSeat: 220_000,
      amount: 440_000,
      channel: 'purchase',
      nature: 'sale',
    });
    expect(license.typeName).toEqual({ fr: '1 an', en: '1 year' });
    await changeCatalog(db, staff, 'kya-soldesign', {
      changes: [
        {
          op: 'license_type',
          edition: 'commercial',
          id: types.get('commercial:365')!,
          fields: { pricePerSeat: 250_000 },
        },
      ],
    });
    const { revision } = await getCatalogEditing(db, 'kya-soldesign');
    await publishCatalog(db, staff, 'kya-soldesign', { expectedRevision: revision! });
    const view = await getLicense({ db, secret: SECRET }, license.id);
    expect(view).toMatchObject({ pricePerSeat: 220_000, amount: 440_000, reference: 'CMD-1' });
  });

  it('exige un motif hors achat et essai, et respecte les postes du type et de l’édition', async () => {
    await expect(issue({ reason: null })).rejects.toMatchObject({ code: 'REASON_REQUIRED' });
    await expect(issue({ type: 'student:30', seats: 2 })).rejects.toMatchObject({ code: 'TOO_MANY_SEATS' });
    await expect(issue({ type: 'student:30', seats: 1 })).resolves.toBeTruthy();
  });

  it('rejouée avec la même clé d’unicité, rend la même licence', async () => {
    const first = await issue({ idempotencyKey: 'emission-unique-001' });
    const again = await issue({ idempotencyKey: 'emission-unique-001' });
    expect(again.replayed).toBe(true);
    expect(again.license.id).toBe(first.license.id);
    expect(again.key).toBe(first.key);
  });

  it('émet avec un type masqué ; le site ne le montre pas', async () => {
    await changeCatalog(db, staff, 'kya-soldesign', {
      changes: [
        {
          op: 'license_type',
          edition: 'commercial',
          fields: { name: { fr: 'Démonstration 30 jours' }, nature: 'free', days: 30, pricePerSeat: 0 },
        },
      ],
    });
    const { revision } = await getCatalogEditing(db, 'kya-soldesign');
    await publishCatalog(db, staff, 'kya-soldesign', { expectedRevision: revision! });
    const hidden = (await getCatalogProduct(db, 'kya-soldesign'))!.editions[0]!.types.find(
      (type) => type.nature === 'free',
    )!;
    expect(hidden.visible).toBe(false);
    const site = await getCatalogProduct(db, 'kya-soldesign', { publicOnly: true });
    expect(site!.editions[0]!.types.some((type) => type.id === hidden.id)).toBe(false);
    const { key } = await issue({ licenseTypeId: hidden.id, seats: 1 });
    expect(key).toMatch(/^KYA-COM-1M-/u);
  });
});

describe('contrat KYA-SolDesign', () => {
  it('émet un jeton que le logiciel vérifie, à la forme attendue', async () => {
    const { key, license } = await issue({ type: 'academic:365', seats: 1 });
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
    const token = (result as { token: string }).token;
    expect(await softwareVerify(`${token.slice(0, -4)}AAAA`, publicJwk)).toBeNull();
  });

  it('une nouvelle édition masquée porte le profil du logiciel : le jeton passe (SC-001)', async () => {
    await changeCatalog(db, staff, 'kya-soldesign', {
      changes: [
        {
          op: 'edition',
          code: 'partner',
          fields: { name: { fr: 'Partenaire' }, softwareEdition: 'commercial', features: ['system.aio'], maxSeats: 5 },
        },
        {
          op: 'license_type',
          edition: 'partner',
          fields: { name: { fr: 'Partenaire 1 an' }, nature: 'partner', days: 365 },
        },
      ],
    });
    const { revision } = await getCatalogEditing(db, 'kya-soldesign');
    await publishCatalog(db, staff, 'kya-soldesign', { expectedRevision: revision! });
    const partner = (await getCatalogProduct(db, 'kya-soldesign'))!.editions.find(
      (edition) => edition.code === 'partner',
    )!;
    const { key } = await issue({
      licenseTypeId: partner.types[0]!.id,
      seats: 3,
      channel: 'partner',
      reason: 'Accord 2026',
    });
    expect(key).toMatch(/^KYA-PAR-12M-/u);
    const result = await activateLicense(deps(), { key, deviceId: 'poste-partenaire-1' });
    const payload = await softwareVerify((result as { token: string }).token, publicJwk);
    expect(payload).toMatchObject({ edition: 'commercial', features: ['system.aio'], limits: { seats: 3 } });
    const site = await getCatalogProduct(db, 'kya-soldesign', { publicOnly: true });
    expect(site?.editions.some((edition) => edition.code === 'partner')).toBe(false);
  });

  it('démarre la validité à la première activation', async () => {
    const { key, license } = await issue({ type: 'commercial:30', seats: 1, startsOnActivation: true });
    expect(license.startsAt).toBeNull();
    expect(license.expiresAt).toBeNull();
    const result = await activateLicense(deps(), { key, deviceId: 'poste-demarrage-1' });
    const payload = await softwareVerify((result as { token: string }).token, publicJwk);
    const span = Date.parse(payload.expiresAt) - Date.parse(payload.startsAt);
    expect(span).toBe(30 * 86_400_000);
    expect(payload.plan).toBe('1m');
  });

  it('décrit l’offre visible au format EditionDescriptor', async () => {
    const descriptors = await editionDescriptors(db, 'kya-soldesign');
    expect(descriptors?.map((item) => item.edition)).toEqual(['commercial', 'academic', 'student']);
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
    const { key, license } = await issue({ type: 'student:30', seats: 1 });
    await activateLicense(deps(), { key, deviceId: 'poste-etudiant-1' });
    await changeCatalog(db, staff, 'kya-soldesign', {
      changes: [
        { op: 'edition', code: 'student', fields: { features: ['system.aio', 'documents.word'], maxProjects: 8 } },
      ],
    });
    // Brouillon : le logiciel ne voit encore rien.
    const before = await refreshLicense(deps(), { licenseId: license.id, deviceId: 'poste-etudiant-1' });
    expect((await softwareVerify((before as { token: string }).token, publicJwk)).features).toEqual(['system.aio']);
    const { revision } = await getCatalogEditing(db, 'kya-soldesign');
    await publishCatalog(db, staff, 'kya-soldesign', { expectedRevision: revision! });
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

describe('lots (spec 005b, histoire 3)', () => {
  it('une licence distincte par courriel ; rejouer ne crée rien de plus (SC-003)', async () => {
    const emails = Array.from({ length: 30 }, (_, index) => `etudiant${index}@isk.tg`);
    const input = {
      licenseTypeId: types.get('student:30')!,
      mode: 'emails' as const,
      emails: [...emails, 'ETUDIANT0@isk.tg'],
      seats: 1,
      label: 'Institut Solaire de Kara — promo 2026',
      reason: 'Convention ISK 2026',
      idempotencyKey: 'lot-isk-2026-0001',
    };
    const first = await generateBatch({ db, secret: SECRET }, staff, input);
    expect(first.replayed).toBe(false);
    expect(first.keys).toHaveLength(30);
    expect(new Set(first.keys.map((item) => item.key)).size).toBe(30);
    const again = await generateBatch({ db, secret: SECRET }, staff, input);
    expect(again.replayed).toBe(true);
    expect(again.batch.id).toBe(first.batch.id);
    expect(await db.select().from(licenses).where(eq(licenses.batchId, first.batch.id))).toHaveLength(30);
    const queued = await db.select().from(jobs).where(eq(jobs.kind, 'mail.license_key'));
    expect(queued.length).toBeGreaterThanOrEqual(30);

    const sent: string[] = [];
    const result = await runDueJobs(
      db,
      { 'mail.license_key': async (payload) => void sent.push(String(payload.email)) },
      undefined,
      50,
    );
    expect(result.done).toBeGreaterThanOrEqual(30);
    expect(sent).toContain('etudiant0@isk.tg');

    const batch = await getBatch({ db, secret: SECRET }, first.batch.id);
    expect(batch?.batch).toMatchObject({ count: 30, activated: 0, mode: 'emails' });
    expect(batch?.licenses[0]).toMatchObject({ channel: 'batch', amount: 0, organizationId: null, startsAt: null });
  });

  it('clés à distribuer : activables telles quelles, rattachées au compte qui saisit la clé', async () => {
    const { keys, batch } = await generateBatch({ db, secret: SECRET }, staff, {
      licenseTypeId: types.get('commercial:30')!,
      mode: 'keys',
      count: 3,
      seats: 1,
      label: 'Salon Energy Lomé',
      reason: 'Stand KYA',
      idempotencyKey: 'lot-salon-0001',
    });
    const result = await activateLicense(deps(), { key: keys[0]!.key, deviceId: 'poste-salon-001' });
    const payload = await softwareVerify((result as { token: string }).token, publicJwk);
    expect(payload.customer).toBe('Salon Energy Lomé');

    const kofiOrg = await ensurePersonalOrganization(db, { id: 'user-kofi', name: 'Kofi Mensah' });
    await claimLicenseByKey(db, { type: 'user', id: 'user-kofi' }, { key: keys[0]!.key, organizationId: kofiOrg });
    await expect(
      claimLicenseByKey(db, { type: 'user', id: 'user-afi' }, { key: keys[0]!.key, organizationId }),
    ).rejects.toMatchObject({ code: 'ALREADY_CLAIMED' });
    const claimed = await getLicense({ db, secret: SECRET }, keys[0]!.licenseId);
    expect(claimed).toMatchObject({ organizationId: kofiOrg, customerName: 'Kofi Mensah' });
    // Le poste déjà actif continue de se rafraîchir.
    expect('token' in (await refreshLicense(deps(), { licenseId: claimed!.id, deviceId: 'poste-salon-001' }))).toBe(
      true,
    );

    expect(await extendBatch(db, staff, { batchId: batch.id, days: 10 })).toBe(3);
    expect((await getLicense({ db, secret: SECRET }, keys[1]!.licenseId))?.days).toBe(40);
    expect(await revokeBatch(db, staff, { batchId: batch.id })).toBe(3);
    const csv = await licenseKeysCsv(
      { db, secret: SECRET },
      keys.map((item) => item.licenseId),
    );
    expect(csv.split('\n')).toHaveLength(4);
    expect(csv).toContain(keys[2]!.key);
  });

  it('rattache à la connexion les licences adressées à un courriel vérifié', async () => {
    const { keys } = await generateBatch({ db, secret: SECRET }, staff, {
      licenseTypeId: types.get('student:30')!,
      mode: 'emails',
      emails: ['nouvelle@exemple.tg'],
      seats: 1,
      label: 'Invitation',
      reason: 'Test',
      idempotencyKey: 'lot-rattachement-01',
    });
    expect(
      await resendBatchMails(db, staff, (await getLicense({ db, secret: SECRET }, keys[0]!.licenseId))!.batchId!),
    ).toBe(1);
    const now = new Date();
    await db.insert(user).values({
      id: 'user-nouvelle',
      name: 'Esi Nouvelle',
      email: 'nouvelle@exemple.tg',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });
    const org = await ensurePersonalOrganization(db, { id: 'user-nouvelle', name: 'Esi Nouvelle' });
    expect(await claimLicensesForEmail(db, { type: 'user', id: 'user-nouvelle' }, 'nouvelle@exemple.tg')).toBe(1);
    const mine = await listLicensesForOrganizations({ db, secret: SECRET }, [org]);
    expect(mine.map((view) => view.id)).toContain(keys[0]!.licenseId);
    expect((await listBatches(db)).length).toBeGreaterThanOrEqual(3);
  });
});

describe('recherche et statistiques', () => {
  it('trouve par clé, courriel ou client, avec le compte de chaque vue', async () => {
    const { key } = await issue({ seats: 1 });
    const mine = await listLicensesForOrganizations({ db, secret: SECRET }, [organizationId]);
    expect(mine.some((view) => view.key === key)).toBe(true);
    expect((await findLicenses({ db, secret: SECRET }, { query: key.toLowerCase() })).items[0]?.key).toBe(key);
    expect((await findLicenses({ db, secret: SECRET }, { query: 'afi@exemple' })).items.length).toBeGreaterThan(0);
    const result = await findLicenses({ db, secret: SECRET }, { view: 'purchased' });
    expect(result.items.every((item) => item.channel === 'purchase')).toBe(true);
    expect(result.counts.all).toBeGreaterThan(result.counts.purchased);
    expect(result.counts.waiting).toBeGreaterThan(0);
    expect((await findLicenseHolders(db, 'kofi'))[0]).toMatchObject({ kind: 'person', name: 'Kofi Mensah' });
  });

  it('compte le vendu sur les montants figés, sépare l’offert et les essais (SC-002)', async () => {
    const stats = await dashboardStats(db, { period: '30j' });
    expect(stats.sold).toMatchObject({ amount: 440_000, count: 1 });
    expect(stats.offered).toBeGreaterThan(30);
    expect(stats.weekly).toHaveLength(8);
    const last = stats.weekly.at(-1)!;
    expect(last.purchase).toBe(1);
    expect(stats.devices.active).toBeGreaterThan(0);
    expect(stats.recent.length).toBeGreaterThan(0);
  });

  it('refuse une édition au-delà de ses postes', async () => {
    await expect(issue({ type: 'student:30', seats: 2 })).rejects.toThrow(LicenseError);
  });
});

describe('essai gratuit (spec 006)', () => {
  const trialUser = async (id: string, email: string) => {
    const now = new Date();
    await db
      .insert(user)
      .values({ id, name: `Essai ${id}`, email, emailVerified: true, createdAt: now, updatedAt: now });
    await ensurePersonalOrganization(db, { id, name: `Essai ${id}` });
    return { userId: id, email, productSlug: 'kya-soldesign' };
  };

  it('émet une licence d’essai que le logiciel vérifie, et programme la clé et les relances (SC-002)', async () => {
    const who = await trialUser('user-essai-1', 'essai1@exemple.tg');
    const before = await trialStatus({ db, secret: SECRET }, { userId: who.userId, productSlug: 'kya-soldesign' });
    expect(before.offer).toMatchObject({ days: 14, typeName: { fr: 'Essai 14 jours' } });
    expect(before.used).toBeNull();

    const { license, key } = await startTrial({ db, secret: SECRET }, { type: 'user', id: who.userId }, who);
    expect(license).toMatchObject({ channel: 'trial', amount: 0, nature: 'trial', days: 14, seats: 1 });
    expect(key).toMatch(/^KYA-COM-14D-/u);
    const result = await activateLicense(deps(), { key, deviceId: 'poste-essai-0001' });
    const payload = await softwareVerify((result as { token: string }).token, publicJwk);
    expect(payload).toMatchObject({ edition: 'commercial', plan: '14d', customer: 'Essai user-essai-1' });

    const scheduled = (await db.select().from(jobs).where(eq(jobs.reference, license.id)))
      .map((job) => job.kind)
      .sort();
    expect(scheduled).toEqual(['mail.license_key', 'mail.trial_ended', 'mail.trial_ending']);
    const after = await trialStatus({ db, secret: SECRET }, { userId: who.userId, productSlug: 'kya-soldesign' });
    expect(after.used).toMatchObject({ licenseId: license.id, key });
    expect((await trialFollowUp({ db, secret: SECRET }, license.id))?.id).toBe(license.id);
  });

  it('un seul essai par compte, même en rafale (SC-003)', async () => {
    const who = await trialUser('user-essai-2', 'essai2@exemple.tg');
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () => startTrial({ db, secret: SECRET }, { type: 'user', id: who.userId }, who)),
    );
    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    for (const item of results.filter((item) => item.status === 'rejected')) {
      expect((item as PromiseRejectedResult).reason).toMatchObject({ code: 'TRIAL_USED' });
    }
    const mine = await db.select().from(licenses).where(eq(licenses.recipientEmail, 'essai2@exemple.tg'));
    expect(mine).toHaveLength(1);
  });

  it('plus de relance après un achat ; essai indisponible sans type réglé', async () => {
    const who = await trialUser('user-essai-3', 'essai3@exemple.tg');
    const { license } = await startTrial({ db, secret: SECRET }, { type: 'user', id: who.userId }, who);
    await issue({
      organizationId: license.organizationId,
      channel: 'purchase',
      amount: 220_000,
      reason: null,
      seats: 1,
    });
    expect(await trialFollowUp({ db, secret: SECRET }, license.id)).toBeNull();

    await changeCatalog(db, staff, 'kya-soldesign', {
      changes: [{ op: 'product', fields: { trialLicenseTypeId: null } }],
    });
    const { revision } = await getCatalogEditing(db, 'kya-soldesign');
    await publishCatalog(db, staff, 'kya-soldesign', { expectedRevision: revision! });
    const other = await trialUser('user-essai-4', 'essai4@exemple.tg');
    await expect(startTrial({ db, secret: SECRET }, { type: 'user', id: other.userId }, other)).rejects.toMatchObject({
      code: 'TRIAL_UNAVAILABLE',
    });
    expect(
      (await trialStatus({ db, secret: SECRET }, { userId: null, productSlug: 'kya-soldesign' })).offer,
    ).toBeNull();
  });
});
