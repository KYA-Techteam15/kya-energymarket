import { randomUUID } from 'node:crypto';
import {
  editionFeatures,
  editions,
  licenseTypes,
  pageVersions,
  productFeatures,
  products,
  type Database,
} from '@kya-em/db';
import { and, eq } from 'drizzle-orm';
import { upsertFeature, upsertProduct, type Actor, type Locale } from '../catalog/catalog.ts';
import { ensurePage, publishDraft, saveDraft } from '../content/pages.ts';
import { registerStaticImage } from '../media/media.ts';
import { SEED_IMAGES, SEED_PRODUCTS } from './catalog.ts';
import { about, contact, help, legalNotice, privacy, purchase, terms } from './pages-market.ts';
import { guide, presentation, pricing, resources, support } from './pages-soldesign.ts';

export interface SeedPage {
  readonly productSlug: string | null;
  readonly key: string;
  readonly fr: { title: string; description: string; blocks: { type: string; data: Record<string, unknown> }[] };
  readonly en: SeedPage['fr'];
}

const page = (productSlug: string | null, key: string, build: (locale: Locale) => SeedPage['fr']): SeedPage => ({
  productSlug,
  key,
  fr: build('fr'),
  en: build('en'),
});

export const SEED_PAGES: readonly SeedPage[] = [
  page('kya-soldesign', 'presentation', presentation),
  page('kya-soldesign', 'tarifs', pricing),
  page('kya-soldesign', 'ressources', resources),
  page('kya-soldesign', 'support', support),
  page('kya-soldesign', 'guide', guide),
  page(null, 'aide', help),
  page(null, 'a-propos', about),
  page(null, 'contact', contact),
  page(null, 'achat', purchase),
  page(null, 'cgv', terms),
  page(null, 'confidentialite', privacy),
  page(null, 'mentions-legales', legalNotice),
];

const SYSTEM: Actor = { type: 'system', id: null };

/**
 * Charge le contenu initial (spec 004, FR-010). Idempotent et prudent : ce qui existe n'est jamais
 * remplacé — un logiciel, une édition, un type de licence ou une page déjà saisis restent tels quels.
 */
export async function seedInitialContent(db: Database) {
  const report = { products: 0, editions: 0, types: 0, pages: 0, images: 0 };
  for (const image of SEED_IMAGES) {
    await registerStaticImage(db, image);
    report.images += 1;
  }

  for (const product of SEED_PRODUCTS) {
    const [known] = await db.select({ id: products.id }).from(products).where(eq(products.slug, product.slug)).limit(1);
    if (known) continue;
    const created = await upsertProduct(db, SYSTEM, product.slug, {
      name: product.name,
      status: product.status,
      sort: product.sort,
      kind: product.kind,
      summary: product.summary,
      logo: product.logo ?? null,
      monogram: product.monogram ?? null,
      softwareEditions: [...(product.softwareEditions ?? [])],
    });
    report.products += 1;
    for (const [index, feature] of (product.features ?? []).entries()) {
      await upsertFeature(db, SYSTEM, product.slug, feature.key, { label: feature.label, sort: index });
    }
    const productId = created.id;
    const features = await db.select().from(productFeatures).where(eq(productFeatures.productId, created.id));
    for (const [index, edition] of (product.editions ?? []).entries()) {
      const [row] = await db
        .insert(editions)
        .values({
          productId: created.id,
          code: edition.code,
          name: edition.name,
          audience: edition.audience,
          softwareEdition: edition.code,
          sort: index,
          watermark: edition.watermark,
          graceDays: edition.graceDays,
          maxSeats: edition.maxSeats,
          maxProjects: edition.maxProjects,
          visible: true,
          forSale: true,
        })
        .returning();
      const ids = features.filter((feature) => edition.features.includes(feature.key)).map((feature) => feature.id);
      if (ids.length)
        await db.insert(editionFeatures).values(ids.map((featureId) => ({ editionId: row!.id, featureId })));
      report.editions += 1;
      for (const [sort, type] of edition.types.entries()) {
        const [created] = await db
          .insert(licenseTypes)
          .values({
            editionId: row!.id,
            name: type.name,
            nature: type.trial ? 'trial' : 'sale',
            days: type.days,
            pricePerSeat: type.pricePerSeat,
            indicative: !type.trial,
            visible: !type.trial,
            forSale: !type.trial,
            ...(type.trial ? { seatsMax: 1, renewable: false } : {}),
            sort,
          })
          .returning({ id: licenseTypes.id });
        if (type.trial) {
          await db.update(products).set({ trialLicenseTypeId: created!.id }).where(eq(products.id, productId));
        }
        report.types += 1;
      }
    }
  }

  for (const seed of SEED_PAGES) {
    const pageId = await ensurePage(db, { productSlug: seed.productSlug, key: seed.key });
    for (const locale of ['fr', 'en'] as const) {
      const [any] = await db
        .select({ id: pageVersions.id })
        .from(pageVersions)
        .where(and(eq(pageVersions.pageId, pageId), eq(pageVersions.locale, locale)))
        .limit(1);
      if (any) continue;
      const content = seed[locale];
      await saveDraft(db, SYSTEM, {
        pageId,
        locale,
        title: content.title,
        description: content.description,
        blocks: content.blocks.map((block) => ({ id: randomUUID(), ...block })),
      });
      await publishDraft(db, SYSTEM, { pageId, locale });
      report.pages += 1;
    }
  }
  return report;
}
