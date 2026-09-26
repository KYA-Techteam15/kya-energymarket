import {
  editionFeatures,
  editions,
  licenseTypes,
  productFeatures,
  products,
  type Database,
  type LicenseTypeNature,
  type LocalizedText,
} from '@kya-em/db';
import { asc, eq, inArray, ne } from 'drizzle-orm';
import { z } from 'zod';
import { recordAuditEvent } from '../audit/recordAuditEvent.ts';

/**
 * Catalogue (spec 004, 005b) : la seule source des logiciels, éditions, types de licence et prix. Les
 * pages, l'API, le MCP et les licences lisent ici l'offre **publiée** ; les modifications de l'équipe
 * passent par le brouillon (`draft.ts`).
 */
export type Locale = 'fr' | 'en';
export type ProductStatus = 'available' | 'soon' | 'hidden';
export type { LicenseTypeNature };

export { NATURES } from '../constants.ts';

/** Texte dans la langue demandée, sinon le français. */
export const pick = (text: LocalizedText | null | undefined, locale: Locale) =>
  (text ? (locale === 'en' ? text.en || text.fr : text.fr) : '') ?? '';

const NAMED_DAYS: Record<number, LocalizedText> = {
  1: { fr: '1 jour', en: '1 day' },
  7: { fr: '1 semaine', en: '1 week' },
  30: { fr: '1 mois', en: '1 month' },
  91: { fr: '1 trimestre', en: '3 months' },
  182: { fr: '6 mois', en: '6 months' },
  365: { fr: '1 an', en: '1 year' },
  730: { fr: '2 ans', en: '2 years' },
};

/** Durée lisible : « 1 an », « 1 trimestre », sinon « 45 jours ». */
export const daysLabel = (days: number, locale: Locale) =>
  pick(NAMED_DAYS[days] ?? { fr: `${days} jours`, en: `${days} days` }, locale);

/** Code de formule porté par le jeton et la clé : `1d`, `1w`, `1m`, `3m`, `6m`, `12m`, sinon `<jours>d`. */
export const planCodeOf = (days: number) =>
  ({ 1: '1d', 7: '1w', 30: '1m', 91: '3m', 182: '6m', 365: '12m' })[days] ?? `${days}d`;

export interface CatalogLicenseType {
  readonly id: string;
  readonly name: LocalizedText;
  readonly nature: LicenseTypeNature;
  readonly days: number;
  readonly pricePerSeat: number;
  readonly indicative: boolean;
  readonly seatsMin: number;
  /** `null` : le maximum de l'édition. */
  readonly seatsMax: number | null;
  readonly renewable: boolean;
  readonly visible: boolean;
  readonly forSale: boolean;
  readonly archived: boolean;
}

export interface CatalogEdition {
  readonly id: string;
  readonly code: string;
  readonly name: LocalizedText;
  readonly audience: LocalizedText;
  /** Code d'édition porté par le jeton, parmi ceux que le logiciel connaît. */
  readonly softwareEdition: string;
  readonly watermark: LocalizedText | null;
  readonly graceDays: number;
  readonly maxSeats: number | null;
  readonly maxProjects: number | null;
  readonly highlights: readonly LocalizedText[];
  readonly visible: boolean;
  readonly forSale: boolean;
  readonly archived: boolean;
  /** Clés des fonctions incluses. */
  readonly features: readonly string[];
  readonly types: readonly CatalogLicenseType[];
}

export interface CatalogProduct {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly status: ProductStatus;
  readonly kind: LocalizedText;
  readonly summary: LocalizedText;
  readonly logo: string | null;
  readonly monogram: string | null;
  readonly softwareEditions: readonly string[];
  readonly catalogVersion: number;
  readonly features: readonly { key: string; label: LocalizedText }[];
  readonly editions: readonly CatalogEdition[];
}

/** Logiciels visibles au catalogue public (`available`, `soon`), dans l'ordre choisi. */
export async function listProducts(db: Database, options: { includeHidden?: boolean } = {}) {
  const rows = await db
    .select()
    .from(products)
    .where(options.includeHidden ? undefined : ne(products.status, 'hidden'))
    .orderBy(asc(products.sort), asc(products.name));
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    kind: row.kind,
    summary: row.summary,
    logo: row.logo,
    monogram: row.monogram,
  }));
}

/**
 * Un logiciel et son offre publiée. `publicOnly` : logiciel non masqué, éditions et types visibles et
 * non archivés (site, API) ; sinon tout (console, MCP, licences).
 */
export async function getCatalogProduct(
  db: Database,
  slug: string,
  options: { publicOnly?: boolean } = {},
): Promise<CatalogProduct | null> {
  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!product || (options.publicOnly && product.status === 'hidden')) return null;

  const [featureRows, editionRows] = await Promise.all([
    db
      .select()
      .from(productFeatures)
      .where(eq(productFeatures.productId, product.id))
      .orderBy(asc(productFeatures.sort)),
    db.select().from(editions).where(eq(editions.productId, product.id)).orderBy(asc(editions.sort)),
  ]);
  const editionIds = editionRows.map((row) => row.id);
  const [typeRows, links] = editionIds.length
    ? await Promise.all([
        db
          .select()
          .from(licenseTypes)
          .where(inArray(licenseTypes.editionId, editionIds))
          .orderBy(asc(licenseTypes.sort), asc(licenseTypes.createdAt)),
        db.select().from(editionFeatures).where(inArray(editionFeatures.editionId, editionIds)),
      ])
    : [[], []];
  const keyOf = new Map(featureRows.map((row) => [row.id, row.key]));
  const order = new Map(featureRows.map((row, index) => [row.key, index]));
  const shown = (item: { visible: boolean; archivedAt: Date | null }) =>
    !options.publicOnly || (item.visible && !item.archivedAt);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    status: product.status,
    kind: product.kind,
    summary: product.summary,
    logo: product.logo,
    monogram: product.monogram,
    softwareEditions: product.softwareEditions,
    catalogVersion: product.catalogVersion,
    features: featureRows.map((row) => ({ key: row.key, label: row.label })),
    editions: editionRows.filter(shown).map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      audience: row.audience,
      softwareEdition: row.softwareEdition,
      watermark: row.watermark,
      graceDays: row.graceDays,
      maxSeats: row.maxSeats,
      maxProjects: row.maxProjects,
      highlights: row.highlights,
      visible: row.visible,
      forSale: row.forSale,
      archived: row.archivedAt !== null,
      features: links
        .filter((link) => link.editionId === row.id)
        .map((link) => keyOf.get(link.featureId))
        .filter((key): key is string => Boolean(key))
        .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)),
      types: typeRows
        .filter((type) => type.editionId === row.id && shown(type))
        .map((type) => ({
          id: type.id,
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
          archived: type.archivedAt !== null,
        })),
    })),
  };
}

// ---------------------------------------------------------------- écritures directes (amorçage)

export const localized = z.object({
  fr: z.string().trim().min(1).max(400),
  en: z.string().trim().max(400).optional(),
});
export const slugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/u, 'identifiant en minuscules et tirets');
export const featureKeySchema = z.string().regex(/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)*$/u);

export const ProductInput = z.strictObject({
  name: z.string().trim().min(2).max(60).optional(),
  status: z.enum(['available', 'soon', 'hidden']).optional(),
  sort: z.number().int().min(0).max(999).optional(),
  kind: localized.optional(),
  summary: localized.optional(),
  logo: z
    .string()
    .regex(/^(\/images\/[\w./-]+|media:[0-9a-f-]{36})$/u)
    .nullable()
    .optional(),
  monogram: z.string().trim().max(3).nullable().optional(),
  softwareEditions: z
    .array(z.string().regex(/^[a-z][a-z0-9_]{1,30}$/u))
    .max(20)
    .optional(),
});

export const FeatureInput = z.strictObject({
  label: localized,
  sort: z.number().int().min(0).max(999).optional(),
});

export type CatalogErrorCode =
  | 'PRODUCT_NOT_FOUND'
  | 'EDITION_NOT_FOUND'
  | 'TYPE_NOT_FOUND'
  | 'UNKNOWN_FEATURE'
  | 'INVALID_CATALOG'
  | 'DRAFT_CONFLICT'
  | 'NOTHING_TO_PUBLISH'
  | 'NOT_REMOVABLE';

export class CatalogError extends Error {
  constructor(
    readonly code: CatalogErrorCode,
    readonly issues: readonly { path: string; message: string }[] = [],
  ) {
    super(code);
  }
}

export interface Actor {
  readonly type: 'kya_staff' | 'mcp_client' | 'system' | 'software' | 'user';
  readonly id: string | null;
}

export const audit = (
  db: Database,
  actor: Actor,
  action: string,
  resourceType: string,
  resourceId: string,
  details: Record<string, unknown> = {},
) =>
  recordAuditEvent(db, {
    actorType: actor.type,
    actorId: actor.id,
    action,
    resourceType,
    resourceId,
    outcome: 'success',
    details,
  });

/** Crée le logiciel s'il n'existe pas (amorçage) ; sinon applique les champs fournis. */
export async function upsertProduct(
  db: Database,
  actor: Actor,
  slug: string,
  input: z.input<typeof ProductInput> & { name?: string },
) {
  const values = ProductInput.parse(input);
  slugSchema.parse(slug);
  const [existing] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!existing) {
    const [created] = await db
      .insert(products)
      .values({
        slug,
        name: values.name ?? slug,
        status: values.status ?? 'hidden',
        sort: values.sort ?? 0,
        kind: values.kind ?? { fr: values.name ?? slug },
        summary: values.summary ?? { fr: values.name ?? slug },
        logo: values.logo ?? null,
        monogram: values.monogram ?? null,
        softwareEditions: values.softwareEditions ?? [],
      })
      .returning();
    await audit(db, actor, 'catalog.product_created', 'product', created!.id, { slug });
    return created!;
  }
  const [updated] = await db
    .update(products)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(products.id, existing.id))
    .returning();
  await audit(db, actor, 'catalog.product_updated', 'product', existing.id, { slug, fields: Object.keys(values) });
  return updated!;
}

/** Fonction d'un logiciel : sa clé est fixée par le logiciel (amorçage, MCP). */
export async function upsertFeature(
  db: Database,
  actor: Actor,
  productSlug: string,
  key: string,
  input: z.input<typeof FeatureInput>,
) {
  const values = FeatureInput.parse(input);
  featureKeySchema.parse(key);
  const [product] = await db.select().from(products).where(eq(products.slug, productSlug)).limit(1);
  if (!product) throw new CatalogError('PRODUCT_NOT_FOUND');
  const [row] = await db
    .insert(productFeatures)
    .values({ productId: product.id, key, label: values.label, sort: values.sort ?? 0 })
    .onConflictDoUpdate({
      target: [productFeatures.productId, productFeatures.key],
      set: { label: values.label, ...(values.sort === undefined ? {} : { sort: values.sort }) },
    })
    .returning();
  await audit(db, actor, 'catalog.feature_saved', 'product_feature', row!.id, { key });
  return row!;
}
