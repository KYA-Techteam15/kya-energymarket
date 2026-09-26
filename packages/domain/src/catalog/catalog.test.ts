import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditEvents, media, type Database } from '@kya-em/db';
import { createTestDatabase } from '@kya-em/db/testing';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { blocksSchema } from '../content/blocks.ts';
import {
  ensurePage,
  getPageForEditing,
  getPreviewPage,
  getPublishedPage,
  listPages,
  PageError,
  publishDraft,
  restoreVersion,
  saveDraft,
} from '../content/pages.ts';
import { collectMediaRefs, resolveMedia, uploadImage } from '../media/media.ts';
import { createLocalMediaStorage } from '../media/storage.ts';
import { SEED_PAGES, seedInitialContent } from '../seed/pages.ts';
import {
  CatalogError,
  durationLabel,
  getCatalogProduct,
  listProducts,
  pick,
  setPlan,
  upsertEdition,
} from './catalog.ts';

let handle: Awaited<ReturnType<typeof createTestDatabase>>;
let db: Database;
const staff = { type: 'kya_staff' as const, id: 'equipe-1' };

beforeAll(async () => {
  handle = await createTestDatabase();
  db = handle.db;
});
afterAll(async () => {
  await handle.close();
});

describe('contenu initial (spec 004, FR-010)', () => {
  it('valide chaque bloc de chaque page, en français et en anglais', () => {
    for (const page of SEED_PAGES) {
      for (const locale of ['fr', 'en'] as const) {
        const blocks = page[locale].blocks.map((block, index) => ({ id: `b${index}`, ...block }));
        const parsed = blocksSchema.safeParse(blocks);
        expect(parsed.success, `${page.key} (${locale}) : ${JSON.stringify(parsed.error?.issues[0])}`).toBe(true);
      }
    }
  });

  it('charge le catalogue et les pages, puis ne remplace rien au second passage', async () => {
    const first = await seedInitialContent(db);
    expect(first).toMatchObject({ products: 4, editions: 3, plans: 6, pages: SEED_PAGES.length * 2 });
    await setPlan(db, staff, 'kya-soldesign', 'commercial', 'P1Y', { pricePerSeat: 250_000, indicative: false });
    const second = await seedInitialContent(db);
    expect(second).toMatchObject({ products: 0, editions: 0, plans: 0, pages: 0 });
    const product = await getCatalogProduct(db, 'kya-soldesign');
    expect(product?.editions[0]?.plans.find((plan) => plan.duration === 'P1Y')).toMatchObject({
      pricePerSeat: 250_000,
      indicative: false,
    });
  });
});

describe('catalogue', () => {
  it('liste les logiciels visibles dans l’ordre, sans les masqués', async () => {
    const products = await listProducts(db);
    expect(products.map((product) => product.slug)).toEqual([
      'kya-soldesign',
      'kya-ecolabel',
      'kya-businessmodel',
      'kya-solmonitor',
    ]);
    expect(pick(products[0]!.kind, 'en')).toBe('Off-grid solar system sizing');
  });

  it('rend l’offre complète : fonctions par édition, limites, durées', async () => {
    const product = await getCatalogProduct(db, 'kya-soldesign', { publicOnly: true });
    const student = product?.editions.find((edition) => edition.code === 'student');
    expect(student).toMatchObject({ maxSeats: 1, maxProjects: 5, graceDays: 0, features: ['system.aio'] });
    expect(student?.plans.map((plan) => plan.duration)).toEqual(['P1D', 'P1M']);
    expect(durationLabel('P3M', 'fr')).toBe('1 trimestre');
  });

  it('change les fonctions d’une édition et cache une durée inactive au public', async () => {
    await upsertEdition(db, staff, 'kya-soldesign', 'student', { features: ['system.aio', 'documents.word'] });
    await setPlan(db, staff, 'kya-soldesign', 'student', 'P1D', { pricePerSeat: 1_500, active: false });
    const product = await getCatalogProduct(db, 'kya-soldesign', { publicOnly: true });
    const student = product?.editions.find((edition) => edition.code === 'student');
    expect(student?.features).toEqual(['system.aio', 'documents.word']);
    expect(student?.plans.map((plan) => plan.duration)).toEqual(['P1M']);
    const trace = await db.select().from(auditEvents).where(eq(auditEvents.action, 'catalog.plan_saved'));
    expect(trace.length).toBeGreaterThan(0);
  });

  it('refuse une fonction inconnue, une durée inconnue et un prix négatif', async () => {
    await expect(upsertEdition(db, staff, 'kya-soldesign', 'student', { features: ['voler.lune'] })).rejects.toThrow(
      CatalogError,
    );
    await expect(setPlan(db, staff, 'kya-soldesign', 'student', 'P2Y', { pricePerSeat: 1 })).rejects.toThrow(
      CatalogError,
    );
    await expect(setPlan(db, staff, 'kya-soldesign', 'student', 'P1M', { pricePerSeat: -5 })).rejects.toThrow();
  });
});

describe('pages composées', () => {
  it('sert la version publiée, avec repli sur le français', async () => {
    const fr = await getPublishedPage(db, { productSlug: 'kya-soldesign', key: 'presentation' }, 'fr');
    expect(fr?.content.blocks[0]?.type).toBe('hero');
    const pageId = await ensurePage(db, { productSlug: null, key: 'essai-fr-seulement' });
    await saveDraft(db, staff, { pageId, locale: 'fr', title: 'Seulement en français', blocks: [] });
    await publishDraft(db, staff, { pageId, locale: 'fr' });
    const en = await getPublishedPage(db, { productSlug: null, key: 'essai-fr-seulement' }, 'en');
    expect(en).toMatchObject({ fallback: true, content: { title: 'Seulement en français' } });
  });

  it('ne montre jamais un brouillon au public ; l’aperçu de l’équipe le montre', async () => {
    const ref = { productSlug: null, key: 'aide' };
    const pageId = (await getPublishedPage(db, ref, 'fr'))!.content.pageId;
    const draft = await saveDraft(db, staff, { pageId, locale: 'fr', title: 'Aide (brouillon)', blocks: [] });
    expect((await getPublishedPage(db, ref, 'fr'))?.content.title).toBe('Aide');
    expect((await getPreviewPage(db, ref, 'fr'))?.content.title).toBe('Aide (brouillon)');

    await expect(publishDraft(db, staff, { pageId, locale: 'fr', expectedVersion: draft.version - 1 })).rejects.toThrow(
      PageError,
    );
    await publishDraft(db, staff, { pageId, locale: 'fr', expectedVersion: draft.version });
    expect((await getPublishedPage(db, ref, 'fr'))?.content.title).toBe('Aide (brouillon)');

    await restoreVersion(db, staff, { pageId, locale: 'fr', version: 1 });
    const editing = await getPageForEditing(db, pageId, 'fr');
    expect(editing?.draft?.title).toBe('Aide');
    expect(editing?.history.map((row) => row.status)).toEqual(['draft', 'published', 'archived']);
  });

  it('refuse un brouillon aux blocs invalides', async () => {
    const pageId = await ensurePage(db, { productSlug: null, key: 'a-propos' });
    await expect(
      saveDraft(db, staff, {
        pageId,
        locale: 'fr',
        title: 'X',
        blocks: [
          {
            id: 'x',
            type: 'hero',
            data: { title: 'T', text: 'x', image: '/images/hero.jpg', primary: { label: 'Go', href: 'javascript:x' } },
          },
        ],
      }),
    ).rejects.toThrow(PageError);
  });

  it('liste les pages et leur état par langue', async () => {
    const pages = await listPages(db);
    const presentation = pages.find((page) => page.productSlug === 'kya-soldesign' && page.key === 'presentation');
    expect(presentation).toMatchObject({ fr: { published: 1, draft: null }, en: { published: 1, draft: null } });
  });
});

describe('médias', () => {
  it('convertit l’image en WebP, la range et la résout dans la langue', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'kya-em-media-'));
    try {
      const storage = createLocalMediaStorage(directory);
      const png = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: '#1ca18c' } })
        .png()
        .toBuffer();
      const row = await uploadImage(db, storage, staff, {
        bytes: new Uint8Array(png),
        alt: { fr: 'Carré vert', en: 'Green square' },
      });
      expect(row).toMatchObject({ mime: 'image/webp', width: 2400, height: 1200 });
      expect((await storage.get(row.storageKey!))?.contentType).toBe('image/webp');

      const refs = collectMediaRefs({
        image: `media:${row.id}`,
        list: [{ photo: '/images/hero.jpg' }],
        text: 'media:non',
      });
      expect([...refs].sort()).toEqual(['/images/hero.jpg', `media:${row.id}`]);
      const resolved = await resolveMedia(db, [...refs], 'en');
      expect(resolved[`media:${row.id}`]).toMatchObject({ src: `/media/${row.storageKey}`, alt: 'Green square' });
      expect(resolved['/images/hero.jpg']).toMatchObject({
        alt: 'Solar installation at sunset',
        credit: 'Illustration photo',
      });
      const [stored] = await db.select().from(media).where(eq(media.id, row.id));
      expect(stored?.bytes).toBeGreaterThan(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('refuse ce qui n’est pas une image', async () => {
    const storage = createLocalMediaStorage(join(tmpdir(), 'kya-em-media-refus'));
    await expect(
      uploadImage(db, storage, staff, { bytes: new Uint8Array([1, 2, 3]), alt: { fr: 'x' } }),
    ).rejects.toThrow('NOT_AN_IMAGE');
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>');
    await expect(uploadImage(db, storage, staff, { bytes: svg, alt: { fr: 'x' } })).rejects.toThrow('UNSUPPORTED_TYPE');
  });
});
