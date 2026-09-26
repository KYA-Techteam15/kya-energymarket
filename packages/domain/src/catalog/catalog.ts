import {
  editionFeatures,
  editions,
  plans,
  productFeatures,
  products,
  type Database,
  type LocalizedText,
} from '@kya-em/db';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import { z } from 'zod';
import { recordAuditEvent } from '../audit/recordAuditEvent.ts';

/**
 * Catalogue (spec 004, FR-001) : la seule source des logiciels, éditions, durées et prix. Les pages,
 * l'API, le MCP et, plus tard, les licences le lisent ici.
 */
export type Locale = 'fr' | 'en';
export type ProductStatus = 'available' | 'soon' | 'hidden';

/** Texte dans la langue demandée, sinon le français. */
export const pick = (text: LocalizedText | null | undefined, locale: Locale) =>
  (text ? (locale === 'en' ? text.en || text.fr : text.fr) : '') ?? '';

export const DURATIONS = ['P1D', 'P1W', 'P1M', 'P3M', 'P6M', 'P1Y'] as const;
export type Duration = (typeof DURATIONS)[number];

const DURATION_LABELS: Record<Duration, LocalizedText> = {
  P1D: { fr: '1 jour', en: '1 day' },
  P1W: { fr: '1 semaine', en: '1 week' },
  P1M: { fr: '1 mois', en: '1 month' },
  P3M: { fr: '1 trimestre', en: '3 months' },
  P6M: { fr: '6 mois', en: '6 months' },
  P1Y: { fr: '1 an', en: '1 year' },
};
export const durationLabel = (duration: string, locale: Locale) =>
  pick(DURATION_LABELS[duration as Duration] ?? { fr: duration }, locale);

export interface CatalogPlan {
  readonly id: string;
  readonly duration: string;
  readonly pricePerSeat: number;
  readonly indicative: boolean;
  readonly active: boolean;
}

export interface CatalogEdition {
  readonly id: string;
  readonly code: string;
  readonly name: LocalizedText;
  readonly audience: LocalizedText;
  readonly watermark: LocalizedText | null;
  readonly graceDays: number;
  readonly maxSeats: number | null;
  readonly maxProjects: number | null;
  readonly active: boolean;
  /** Clés des fonctions incluses. */
  readonly features: readonly string[];
  readonly plans: readonly CatalogPlan[];
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
 * Un logiciel et son offre. `publicOnly` : logiciel non masqué, éditions et durées actives seulement
 * (pages publiques, API) ; sinon tout (administration, MCP).
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
  const [planRows, links] = editionIds.length
    ? await Promise.all([
        db.select().from(plans).where(inArray(plans.editionId, editionIds)).orderBy(asc(plans.sort)),
        db.select().from(editionFeatures).where(inArray(editionFeatures.editionId, editionIds)),
      ])
    : [[], []];
  const keyOf = new Map(featureRows.map((row) => [row.id, row.key]));

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    status: product.status,
    kind: product.kind,
    summary: product.summary,
    logo: product.logo,
    monogram: product.monogram,
    features: featureRows.map((row) => ({ key: row.key, label: row.label })),
    editions: editionRows
      .filter((row) => !options.publicOnly || row.active)
      .map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        audience: row.audience,
        watermark: row.watermark,
        graceDays: row.graceDays,
        maxSeats: row.maxSeats,
        maxProjects: row.maxProjects,
        active: row.active,
        features: links
          .filter((link) => link.editionId === row.id)
          .map((link) => keyOf.get(link.featureId))
          .filter((key): key is string => Boolean(key))
          .sort((a, b) => featureRows.findIndex((f) => f.key === a) - featureRows.findIndex((f) => f.key === b)),
        plans: planRows
          .filter((plan) => plan.editionId === row.id && (!options.publicOnly || plan.active))
          .map((plan) => ({
            id: plan.id,
            duration: plan.duration,
            pricePerSeat: plan.pricePerSeat,
            indicative: plan.indicative,
            active: plan.active,
          })),
      })),
  };
}

// ---------------------------------------------------------------- administration

const localized = z.object({ fr: z.string().trim().min(1).max(400), en: z.string().trim().max(400).optional() });
const slugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/u, 'identifiant en minuscules et tirets');

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
});

export const EditionInput = z.strictObject({
  name: localized.optional(),
  audience: localized.optional(),
  sort: z.number().int().min(0).max(999).optional(),
  watermark: localized.nullable().optional(),
  graceDays: z.number().int().min(0).max(90).optional(),
  maxSeats: z.number().int().min(1).max(10_000).nullable().optional(),
  maxProjects: z.number().int().min(1).max(100_000).nullable().optional(),
  active: z.boolean().optional(),
  /** Clés des fonctions incluses (remplace la liste). */
  features: z.array(z.string().min(1).max(60)).max(60).optional(),
});

export const PlanInput = z.strictObject({
  pricePerSeat: z.number().int().min(0).max(100_000_000),
  indicative: z.boolean().optional(),
  active: z.boolean().optional(),
  sort: z.number().int().min(0).max(999).optional(),
});

export const FeatureInput = z.strictObject({
  label: localized,
  sort: z.number().int().min(0).max(999).optional(),
});

export class CatalogError extends Error {
  constructor(readonly code: 'PRODUCT_NOT_FOUND' | 'EDITION_NOT_FOUND' | 'UNKNOWN_FEATURE' | 'INVALID_DURATION') {
    super(code);
  }
}

export interface Actor {
  readonly type: 'kya_staff' | 'mcp_client' | 'system';
  readonly id: string | null;
}

async function productBySlug(db: Database, slug: string) {
  const [row] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!row) throw new CatalogError('PRODUCT_NOT_FOUND');
  return row;
}

async function editionOf(db: Database, productId: string, code: string) {
  const [row] = await db
    .select()
    .from(editions)
    .where(and(eq(editions.productId, productId), eq(editions.code, code)))
    .limit(1);
  if (!row) throw new CatalogError('EDITION_NOT_FOUND');
  return row;
}

const audit = (db: Database, actor: Actor, action: string, resourceType: string, resourceId: string, details = {}) =>
  recordAuditEvent(db, {
    actorType: actor.type,
    actorId: actor.id,
    action,
    resourceType,
    resourceId,
    outcome: 'success',
    details,
  });

/** Crée le logiciel s'il n'existe pas (amorçage, MCP) ; sinon applique les champs fournis. */
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

export async function upsertFeature(
  db: Database,
  actor: Actor,
  productSlug: string,
  key: string,
  input: z.input<typeof FeatureInput>,
) {
  const values = FeatureInput.parse(input);
  z.string()
    .regex(/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)*$/u)
    .parse(key);
  const product = await productBySlug(db, productSlug);
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

export async function upsertEdition(
  db: Database,
  actor: Actor,
  productSlug: string,
  code: string,
  input: z.input<typeof EditionInput>,
) {
  const { features: featureKeys, ...values } = EditionInput.parse(input);
  z.string()
    .regex(/^[a-z][a-z0-9_]{1,30}$/u)
    .parse(code);
  const product = await productBySlug(db, productSlug);
  const [existing] = await db
    .select()
    .from(editions)
    .where(and(eq(editions.productId, product.id), eq(editions.code, code)))
    .limit(1);
  const edition = existing
    ? (
        await db
          .update(editions)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(editions.id, existing.id))
          .returning()
      )[0]!
    : (
        await db
          .insert(editions)
          .values({
            productId: product.id,
            code,
            name: values.name ?? { fr: code },
            audience: values.audience ?? { fr: '' },
            sort: values.sort ?? 0,
            watermark: values.watermark ?? null,
            graceDays: values.graceDays ?? 0,
            maxSeats: values.maxSeats ?? null,
            maxProjects: values.maxProjects ?? null,
            active: values.active ?? true,
          })
          .returning()
      )[0]!;

  if (featureKeys) {
    const known = await db.select().from(productFeatures).where(eq(productFeatures.productId, product.id));
    const ids = featureKeys.map((key) => {
      const feature = known.find((row) => row.key === key);
      if (!feature) throw new CatalogError('UNKNOWN_FEATURE');
      return feature.id;
    });
    await db.transaction(async (tx) => {
      await tx.delete(editionFeatures).where(eq(editionFeatures.editionId, edition.id));
      if (ids.length)
        await tx.insert(editionFeatures).values(ids.map((featureId) => ({ editionId: edition.id, featureId })));
    });
  }
  await audit(db, actor, existing ? 'catalog.edition_updated' : 'catalog.edition_created', 'edition', edition.id, {
    product: productSlug,
    code,
    fields: Object.keys(input),
  });
  return edition;
}

/** Prix d'une durée d'une édition (création ou mise à jour), en FCFA entiers par poste. */
export async function setPlan(
  db: Database,
  actor: Actor,
  productSlug: string,
  editionCode: string,
  duration: string,
  input: z.input<typeof PlanInput>,
) {
  if (!(DURATIONS as readonly string[]).includes(duration)) throw new CatalogError('INVALID_DURATION');
  const values = PlanInput.parse(input);
  const product = await productBySlug(db, productSlug);
  const edition = await editionOf(db, product.id, editionCode);
  const [row] = await db
    .insert(plans)
    .values({
      editionId: edition.id,
      duration,
      pricePerSeat: values.pricePerSeat,
      indicative: values.indicative ?? true,
      active: values.active ?? true,
      sort: values.sort ?? DURATIONS.indexOf(duration as Duration),
    })
    .onConflictDoUpdate({
      target: [plans.editionId, plans.duration],
      set: {
        pricePerSeat: values.pricePerSeat,
        ...(values.indicative === undefined ? {} : { indicative: values.indicative }),
        ...(values.active === undefined ? {} : { active: values.active }),
        ...(values.sort === undefined ? {} : { sort: values.sort }),
        updatedAt: new Date(),
      },
    })
    .returning();
  await audit(db, actor, 'catalog.plan_saved', 'plan', row!.id, {
    product: productSlug,
    edition: editionCode,
    duration,
    pricePerSeat: values.pricePerSeat,
  });
  return row!;
}
