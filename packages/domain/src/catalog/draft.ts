import { randomUUID } from 'node:crypto';
import {
  catalogDrafts,
  editionFeatures,
  editions,
  licenseTypes,
  productFeatures,
  products,
  type Database,
  type LocalizedText,
} from '@kya-em/db';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  audit,
  CatalogError,
  getCatalogProduct,
  localized,
  NATURES,
  pick,
  type Actor,
  type CatalogProduct,
} from './catalog.ts';

/**
 * Brouillon du catalogue (spec 005b, FR-003). L'équipe et le MCP envoient des changements typés ; ils
 * s'appliquent au document du brouillon, qui est validé en entier. Rien n'est public avant
 * `publishCatalog`, qui écrit toutes les différences dans une transaction.
 */

const optionalText = z.object({ fr: z.string().trim().max(400), en: z.string().trim().max(400).optional() });
export const editionCodeSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{1,30}$/u, 'code en minuscules (lettres, chiffres, _)');

export const DocLicenseType = z.strictObject({
  id: z.uuid(),
  name: localized,
  nature: z.enum(NATURES),
  days: z.number().int().min(1).max(3650),
  pricePerSeat: z.number().int().min(0).max(100_000_000),
  indicative: z.boolean(),
  seatsMin: z.number().int().min(1).max(10_000),
  seatsMax: z.number().int().min(1).max(10_000).nullable(),
  renewable: z.boolean(),
  visible: z.boolean(),
  forSale: z.boolean(),
  archived: z.boolean(),
});

export const DocEdition = z.strictObject({
  id: z.uuid(),
  code: editionCodeSchema,
  name: localized,
  audience: optionalText,
  softwareEdition: z.string().min(1).max(40),
  watermark: localized.nullable(),
  graceDays: z.number().int().min(0).max(90),
  maxSeats: z.number().int().min(1).max(10_000).nullable(),
  maxProjects: z.number().int().min(1).max(100_000).nullable(),
  highlights: z.array(localized).max(20),
  visible: z.boolean(),
  forSale: z.boolean(),
  archived: z.boolean(),
  features: z.array(z.string().min(1).max(60)).max(60),
  types: z.array(DocLicenseType).max(50),
});

const DocProduct = z.strictObject({
  name: z.string().trim().min(2).max(60),
  status: z.enum(['available', 'soon', 'hidden']),
  kind: localized,
  summary: localized,
  logo: z
    .string()
    .regex(/^(\/images\/[\w./-]+|media:[0-9a-f-]{36})$/u)
    .nullable(),
  monogram: z.string().trim().max(3).nullable(),
  /** Type de licence de l'essai gratuit (nature `trial`) ; `null` : pas d'essai (spec 006). */
  trialLicenseTypeId: z.uuid().nullable().default(null),
});

export const CatalogDocument = z.strictObject({
  product: DocProduct,
  features: z.array(z.strictObject({ key: z.string(), label: localized })),
  editions: z.array(DocEdition).max(30),
});
export type CatalogDocument = z.infer<typeof CatalogDocument>;
export type DocEdition = z.infer<typeof DocEdition>;
export type DocLicenseType = z.infer<typeof DocLicenseType>;

export const EditionFields = DocEdition.omit({ id: true, code: true, types: true }).partial();
export const LicenseTypeFields = DocLicenseType.omit({ id: true }).partial();

/** Un changement du brouillon ; la console et le MCP n'en connaissent pas d'autre. */
export const CatalogChange = z.discriminatedUnion('op', [
  z.strictObject({ op: z.literal('product'), fields: DocProduct.partial() }),
  z.strictObject({ op: z.literal('feature'), key: z.string().min(1).max(60), label: localized }),
  /** Modifie une édition ; un code inconnu la crée (masquée, hors vente). */
  z.strictObject({ op: z.literal('edition'), code: editionCodeSchema, fields: EditionFields }),
  z.strictObject({ op: z.literal('move_edition'), code: editionCodeSchema, to: z.number().int().min(0).max(29) }),
  /** Modifie un type de licence ; sans `id`, en crée un (masqué, hors vente). */
  z.strictObject({
    op: z.literal('license_type'),
    edition: editionCodeSchema,
    id: z.uuid().optional(),
    fields: LicenseTypeFields,
  }),
  z.strictObject({
    op: z.literal('move_license_type'),
    edition: editionCodeSchema,
    id: z.uuid(),
    to: z.number().int().min(0).max(49),
  }),
  /** Retire une édition ou un type jamais publiés (ce qui a été publié s'archive). */
  z.strictObject({ op: z.literal('remove'), edition: editionCodeSchema, id: z.uuid().optional() }),
]);
export type CatalogChange = z.infer<typeof CatalogChange>;

/** Offre publiée mise en forme de document (point de départ d'un brouillon). */
export function documentOf(product: CatalogProduct): CatalogDocument {
  return {
    product: {
      name: product.name,
      status: product.status,
      kind: product.kind,
      summary: product.summary,
      logo: product.logo,
      monogram: product.monogram,
      trialLicenseTypeId: product.trialLicenseTypeId,
    },
    features: product.features.map((feature) => ({ key: feature.key, label: feature.label })),
    editions: product.editions.map((edition) => ({
      id: edition.id,
      code: edition.code,
      name: edition.name,
      audience: edition.audience,
      softwareEdition: edition.softwareEdition,
      watermark: edition.watermark,
      graceDays: edition.graceDays,
      maxSeats: edition.maxSeats,
      maxProjects: edition.maxProjects,
      highlights: [...edition.highlights],
      visible: edition.visible,
      forSale: edition.forSale,
      archived: edition.archived,
      features: [...edition.features],
      types: edition.types.map((type) => ({ ...type })),
    })),
  };
}

const move = <T>(items: T[], from: number, to: number) => {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(Math.min(to, next.length), 0, item!);
  return next;
};

/** Applique un changement au document ; `published` : identifiants déjà publiés (non retirables). */
export function applyChange(
  document: CatalogDocument,
  change: CatalogChange,
  context: { published: ReadonlySet<string>; softwareEditions: readonly string[] },
): CatalogDocument {
  const doc: CatalogDocument = structuredClone(document);
  const editionAt = (code: string) => {
    const index = doc.editions.findIndex((edition) => edition.code === code);
    if (index < 0) throw new CatalogError('EDITION_NOT_FOUND');
    return index;
  };
  switch (change.op) {
    case 'product':
      doc.product = { ...doc.product, ...change.fields };
      return doc;
    case 'feature': {
      const feature = doc.features.find((item) => item.key === change.key);
      if (!feature) throw new CatalogError('UNKNOWN_FEATURE');
      feature.label = change.label;
      return doc;
    }
    case 'edition': {
      const index = doc.editions.findIndex((edition) => edition.code === change.code);
      if (index < 0) {
        doc.editions.push({
          id: randomUUID(),
          code: change.code,
          name: { fr: change.code },
          audience: { fr: '' },
          softwareEdition: context.softwareEditions[0] ?? change.code,
          watermark: null,
          graceDays: 7,
          maxSeats: null,
          maxProjects: null,
          highlights: [],
          visible: false,
          forSale: false,
          archived: false,
          features: [],
          types: [],
          ...change.fields,
        });
      } else {
        doc.editions[index] = { ...doc.editions[index]!, ...change.fields };
      }
      return doc;
    }
    case 'move_edition':
      doc.editions = move(doc.editions, editionAt(change.code), change.to);
      return doc;
    case 'license_type': {
      const edition = doc.editions[editionAt(change.edition)]!;
      if (!change.id) {
        edition.types.push({
          id: randomUUID(),
          name: { fr: 'Nouveau type', en: 'New type' },
          nature: 'sale',
          days: 365,
          pricePerSeat: 0,
          indicative: true,
          seatsMin: 1,
          seatsMax: null,
          renewable: true,
          visible: false,
          forSale: false,
          archived: false,
          ...change.fields,
        });
        return doc;
      }
      const index = edition.types.findIndex((type) => type.id === change.id);
      if (index < 0) throw new CatalogError('TYPE_NOT_FOUND');
      edition.types[index] = { ...edition.types[index]!, ...change.fields };
      return doc;
    }
    case 'move_license_type': {
      const edition = doc.editions[editionAt(change.edition)]!;
      const index = edition.types.findIndex((type) => type.id === change.id);
      if (index < 0) throw new CatalogError('TYPE_NOT_FOUND');
      edition.types = move(edition.types, index, change.to);
      return doc;
    }
    case 'remove': {
      const index = editionAt(change.edition);
      const edition = doc.editions[index]!;
      if (!change.id) {
        if (context.published.has(edition.id)) throw new CatalogError('NOT_REMOVABLE');
        doc.editions.splice(index, 1);
        return doc;
      }
      if (context.published.has(change.id)) throw new CatalogError('NOT_REMOVABLE');
      edition.types = edition.types.filter((type) => type.id !== change.id);
      return doc;
    }
  }
}

/** Valide le document entier : forme, codes uniques, profils et fonctions connus, postes cohérents. */
export function validateDocument(input: unknown, softwareEditions: readonly string[]): CatalogDocument {
  const parsed = CatalogDocument.safeParse(input);
  if (!parsed.success) {
    throw new CatalogError(
      'INVALID_CATALOG',
      parsed.error.issues.map((issue) => ({ path: issue.path.map(String).join('.'), message: issue.message })),
    );
  }
  const doc = parsed.data;
  const issues: { path: string; message: string }[] = [];
  const keys = new Set(doc.features.map((feature) => feature.key));
  const codes = new Set<string>();
  const ids = new Set<string>();
  doc.editions.forEach((edition, e) => {
    const at = `editions.${e}`;
    if (codes.has(edition.code)) issues.push({ path: `${at}.code`, message: 'code déjà utilisé' });
    codes.add(edition.code);
    if (softwareEditions.length && !softwareEditions.includes(edition.softwareEdition)) {
      issues.push({ path: `${at}.softwareEdition`, message: 'profil inconnu du logiciel' });
    }
    edition.features.forEach((key, f) => {
      if (!keys.has(key)) issues.push({ path: `${at}.features.${f}`, message: 'fonction inconnue du logiciel' });
    });
    edition.types.forEach((type, t) => {
      const path = `${at}.types.${t}`;
      if (ids.has(type.id)) issues.push({ path: `${path}.id`, message: 'identifiant en double' });
      ids.add(type.id);
      if (type.seatsMax !== null && type.seatsMax < type.seatsMin) {
        issues.push({ path: `${path}.seatsMax`, message: 'maximum inférieur au minimum' });
      }
      if (edition.maxSeats !== null && type.seatsMin > edition.maxSeats) {
        issues.push({ path: `${path}.seatsMin`, message: 'au-delà des postes maximum de l’édition' });
      }
      if (edition.maxSeats !== null && type.seatsMax !== null && type.seatsMax > edition.maxSeats) {
        issues.push({ path: `${path}.seatsMax`, message: 'au-delà des postes maximum de l’édition' });
      }
    });
  });
  if (doc.product.trialLicenseTypeId) {
    const trial = doc.editions
      .flatMap((edition) => edition.types)
      .find((type) => type.id === doc.product.trialLicenseTypeId);
    if (!trial || trial.nature !== 'trial' || trial.archived) {
      issues.push({
        path: 'product.trialLicenseTypeId',
        message: 'type d’essai introuvable, archivé ou d’une autre nature',
      });
    }
  }
  if (issues.length) throw new CatalogError('INVALID_CATALOG', issues);
  return doc;
}

// ---------------------------------------------------------------- différences

export interface CatalogDiff {
  readonly scope: 'product' | 'feature' | 'edition' | 'type' | 'order';
  /** Élément concerné, en français (« Commerciale · 1 an »). */
  readonly target: string;
  readonly field: string | null;
  readonly kind: 'added' | 'changed';
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Ce que la publication changerait : une ligne par champ modifié ou élément ajouté. */
export function diffCatalog(live: CatalogDocument, draft: CatalogDocument): CatalogDiff[] {
  const diffs: CatalogDiff[] = [];
  for (const field of Object.keys(draft.product) as (keyof CatalogDocument['product'])[]) {
    if (!same(live.product[field], draft.product[field])) {
      diffs.push({ scope: 'product', target: draft.product.name, field, kind: 'changed' });
    }
  }
  for (const feature of draft.features) {
    const before = live.features.find((item) => item.key === feature.key);
    if (before && !same(before.label, feature.label)) {
      diffs.push({ scope: 'feature', target: feature.key, field: 'label', kind: 'changed' });
    }
  }
  const liveOrder = live.editions.map((edition) => edition.id).join(',');
  const draftOrder = draft.editions
    .filter((edition) => live.editions.some((item) => item.id === edition.id))
    .map((edition) => edition.id)
    .join(',');
  if (liveOrder !== draftOrder && live.editions.length) {
    diffs.push({ scope: 'order', target: 'éditions', field: null, kind: 'changed' });
  }
  for (const edition of draft.editions) {
    const before = live.editions.find((item) => item.id === edition.id);
    const name = pick(edition.name, 'fr');
    if (!before) {
      diffs.push({ scope: 'edition', target: name, field: null, kind: 'added' });
      continue;
    }
    for (const field of Object.keys(edition) as (keyof DocEdition)[]) {
      if (field === 'types' || field === 'id') continue;
      if (!same(before[field], edition[field])) diffs.push({ scope: 'edition', target: name, field, kind: 'changed' });
    }
    const typeOrder = (types: readonly DocLicenseType[], known: readonly DocLicenseType[]) =>
      types
        .filter((type) => known.some((item) => item.id === type.id))
        .map((type) => type.id)
        .join(',');
    if (typeOrder(edition.types, before.types) !== typeOrder(before.types, edition.types)) {
      diffs.push({ scope: 'order', target: `${name} · types`, field: null, kind: 'changed' });
    }
    for (const type of edition.types) {
      const previous = before.types.find((item) => item.id === type.id);
      const target = `${name} · ${pick(type.name, 'fr')}`;
      if (!previous) {
        diffs.push({ scope: 'type', target, field: null, kind: 'added' });
        continue;
      }
      for (const field of Object.keys(type) as (keyof DocLicenseType)[]) {
        if (field !== 'id' && !same(previous[field], type[field])) {
          diffs.push({ scope: 'type', target, field, kind: 'changed' });
        }
      }
    }
  }
  return diffs;
}

// ---------------------------------------------------------------- services

async function productRow(db: Database, slug: string) {
  const [row] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!row) throw new CatalogError('PRODUCT_NOT_FOUND');
  return row;
}

const publishedIds = (product: CatalogProduct) =>
  new Set(product.editions.flatMap((edition) => [edition.id, ...edition.types.map((type) => type.id)]));

export interface CatalogEditing {
  /** Offre publiée (ce que voient le site, l'API et le logiciel). */
  readonly live: CatalogProduct;
  /** Brouillon s'il existe, sinon l'offre publiée. */
  readonly document: CatalogDocument;
  /** Révision du brouillon ; `null` sans brouillon. */
  readonly revision: number | null;
  readonly changes: readonly CatalogDiff[];
  readonly updatedAt: string | null;
  readonly updatedBy: string | null;
  /** Identifiants déjà publiés : ils s'archivent, ils ne se retirent pas. */
  readonly published: readonly string[];
}

export async function getCatalogEditing(db: Database, slug: string): Promise<CatalogEditing> {
  // Offre publiée et brouillon lus en parallèle (moins d'allers-retours vers la base).
  const [live, [draft]] = await Promise.all([
    getCatalogProduct(db, slug),
    db
      .select({ draft: catalogDrafts })
      .from(catalogDrafts)
      .innerJoin(products, eq(catalogDrafts.productId, products.id))
      .where(eq(products.slug, slug))
      .limit(1)
      .then((rows) => rows.map((row) => row.draft)),
  ]);
  if (!live) throw new CatalogError('PRODUCT_NOT_FOUND');
  const base = documentOf(live);
  const document = draft ? (draft.document as CatalogDocument) : base;
  return {
    live,
    document,
    revision: draft?.revision ?? null,
    changes: draft ? diffCatalog(base, document) : [],
    updatedAt: draft?.updatedAt.toISOString() ?? null,
    updatedBy: draft?.updatedBy ?? null,
    published: [...publishedIds(live)],
  };
}

/**
 * Applique des changements au brouillon (le crée au besoin). `expectedRevision` : refus si le
 * brouillon a changé depuis sa lecture (deux personnes sur la même offre).
 */
export async function changeCatalog(
  db: Database,
  actor: Actor,
  slug: string,
  input: { changes: unknown[]; expectedRevision?: number | null },
) {
  const changes = z.array(CatalogChange).min(1).max(100).parse(input.changes);
  return db.transaction(async (tx) => {
    const product = await productRow(tx as unknown as Database, slug);
    await tx.select({ id: products.id }).from(products).where(eq(products.id, product.id)).for('update');
    const live = (await getCatalogProduct(tx as unknown as Database, slug))!;
    const [draft] = await tx.select().from(catalogDrafts).where(eq(catalogDrafts.productId, product.id)).limit(1);
    if (input.expectedRevision !== undefined && (draft?.revision ?? null) !== input.expectedRevision) {
      throw new CatalogError('DRAFT_CONFLICT');
    }
    const context = { published: publishedIds(live), softwareEditions: live.softwareEditions };
    let document = draft ? (draft.document as CatalogDocument) : documentOf(live);
    for (const change of changes) document = applyChange(document, change, context);
    document = validateDocument(document, live.softwareEditions);
    const revision = (draft?.revision ?? 0) + 1;
    await tx
      .insert(catalogDrafts)
      .values({ productId: product.id, document, revision, updatedBy: actor.id })
      .onConflictDoUpdate({
        target: catalogDrafts.productId,
        set: { document, revision, updatedAt: new Date(), updatedBy: actor.id },
      });
    await audit(tx as unknown as Database, actor, 'catalog.draft_changed', 'product', product.id, {
      slug,
      ops: changes.map((change) => change.op),
    });
    return { revision, document, changes: diffCatalog(documentOf(live), document) };
  });
}

export async function discardCatalogDraft(db: Database, actor: Actor, slug: string) {
  const product = await productRow(db, slug);
  const removed = await db
    .delete(catalogDrafts)
    .where(eq(catalogDrafts.productId, product.id))
    .returning({ id: catalogDrafts.productId });
  if (removed.length) await audit(db, actor, 'catalog.draft_discarded', 'product', product.id, { slug });
  return removed.length > 0;
}

const archivedAt = (archived: boolean, current: Date | null | undefined) => (archived ? (current ?? new Date()) : null);

/** Publie le brouillon : toutes les différences dans une transaction, puis le brouillon disparaît. */
export async function publishCatalog(db: Database, actor: Actor, slug: string, input: { expectedRevision: number }) {
  return db.transaction(async (tx) => {
    const t = tx as unknown as Database;
    const product = await productRow(t, slug);
    await tx.select({ id: products.id }).from(products).where(eq(products.id, product.id)).for('update');
    const [draft] = await tx.select().from(catalogDrafts).where(eq(catalogDrafts.productId, product.id)).limit(1);
    if (!draft) throw new CatalogError('NOTHING_TO_PUBLISH');
    if (draft.revision !== input.expectedRevision) throw new CatalogError('DRAFT_CONFLICT');
    const live = (await getCatalogProduct(t, slug))!;
    const doc = validateDocument(draft.document, live.softwareEditions);
    const changes = diffCatalog(documentOf(live), doc);
    const now = new Date();

    // Le type d'essai peut être nouveau : il est rattaché au logiciel après l'écriture des types.
    const { trialLicenseTypeId, ...productFields } = doc.product;
    await tx
      .update(products)
      .set({ ...productFields, catalogVersion: sql`${products.catalogVersion} + 1`, updatedAt: now })
      .where(eq(products.id, product.id));
    for (const [index, feature] of doc.features.entries()) {
      await tx
        .update(productFeatures)
        .set({ label: feature.label, sort: index })
        .where(and(eq(productFeatures.productId, product.id), eq(productFeatures.key, feature.key)));
    }
    const featureRows = await tx.select().from(productFeatures).where(eq(productFeatures.productId, product.id));
    const featureId = new Map(featureRows.map((row) => [row.key, row.id]));
    const currentEditions = new Map(
      (await tx.select().from(editions).where(eq(editions.productId, product.id))).map((row) => [row.id, row]),
    );

    for (const [index, edition] of doc.editions.entries()) {
      const values = {
        code: edition.code,
        name: edition.name,
        audience: edition.audience as LocalizedText,
        softwareEdition: edition.softwareEdition,
        watermark: edition.watermark,
        graceDays: edition.graceDays,
        maxSeats: edition.maxSeats,
        maxProjects: edition.maxProjects,
        highlights: edition.highlights,
        visible: edition.visible,
        forSale: edition.forSale,
        archivedAt: archivedAt(edition.archived, currentEditions.get(edition.id)?.archivedAt),
        sort: index,
        updatedAt: now,
      };
      if (currentEditions.has(edition.id)) {
        await tx.update(editions).set(values).where(eq(editions.id, edition.id));
      } else {
        await tx.insert(editions).values({ id: edition.id, productId: product.id, ...values });
      }
      await tx.delete(editionFeatures).where(eq(editionFeatures.editionId, edition.id));
      const ids = edition.features.map((key) => featureId.get(key)).filter((id): id is string => Boolean(id));
      if (ids.length) {
        await tx.insert(editionFeatures).values(ids.map((id) => ({ editionId: edition.id, featureId: id })));
      }
      const currentTypes = new Map(
        (await tx.select().from(licenseTypes).where(eq(licenseTypes.editionId, edition.id))).map((row) => [
          row.id,
          row,
        ]),
      );
      for (const [position, type] of edition.types.entries()) {
        const typeValues = {
          name: type.name,
          nature: type.nature,
          days: type.days,
          pricePerSeat: type.pricePerSeat,
          indicative: type.indicative,
          seatsMin: type.seatsMin,
          seatsMax: type.seatsMax,
          renewable: type.renewable,
          visible: type.visible,
          forSale: type.forSale,
          archivedAt: archivedAt(type.archived, currentTypes.get(type.id)?.archivedAt),
          sort: position,
          updatedAt: now,
        };
        if (currentTypes.has(type.id)) {
          await tx.update(licenseTypes).set(typeValues).where(eq(licenseTypes.id, type.id));
        } else {
          await tx.insert(licenseTypes).values({ id: type.id, editionId: edition.id, ...typeValues });
        }
      }
    }
    await tx.update(products).set({ trialLicenseTypeId }).where(eq(products.id, product.id));
    await tx.delete(catalogDrafts).where(eq(catalogDrafts.productId, product.id));
    await audit(t, actor, 'catalog.published', 'product', product.id, {
      slug,
      version: live.catalogVersion + 1,
      changes: changes.map(
        (change) => `${change.kind} ${change.scope} ${change.target}${change.field ? ` ${change.field}` : ''}`,
      ),
    });
    return { version: live.catalogVersion + 1, changes };
  });
}
