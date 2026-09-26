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
import { CatalogError, daysLabel, getCatalogProduct, listProducts, pick, planCodeOf } from './catalog.ts';
import { changeCatalog, discardCatalogDraft, getCatalogEditing, publishCatalog } from './draft.ts';

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
    expect(first).toMatchObject({ products: 4, editions: 3, types: 7, pages: SEED_PAGES.length * 2 });
    const annual = (await getCatalogProduct(db, 'kya-soldesign'))!.editions[0]!.types.find(
      (type) => type.days === 365,
    )!;
    await changeCatalog(db, staff, 'kya-soldesign', {
      changes: [
        {
          op: 'license_type',
          edition: 'commercial',
          id: annual.id,
          fields: { pricePerSeat: 250_000, indicative: false },
        },
      ],
    });
    const { revision } = await getCatalogEditing(db, 'kya-soldesign');
    await publishCatalog(db, staff, 'kya-soldesign', { expectedRevision: revision! });
    const second = await seedInitialContent(db);
    expect(second).toMatchObject({ products: 0, editions: 0, types: 0, pages: 0 });
    const product = await getCatalogProduct(db, 'kya-soldesign');
    expect(product?.editions[0]?.types.find((type) => type.days === 365)).toMatchObject({
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

  it('rend l’offre publiée : fonctions par édition, limites, types de licence, profil du logiciel', async () => {
    const product = await getCatalogProduct(db, 'kya-soldesign', { publicOnly: true });
    expect(product?.softwareEditions).toEqual(['commercial', 'academic', 'student']);
    const student = product?.editions.find((edition) => edition.code === 'student');
    expect(student).toMatchObject({
      maxSeats: 1,
      maxProjects: 5,
      graceDays: 0,
      features: ['system.aio'],
      softwareEdition: 'student',
      visible: true,
      forSale: true,
    });
    expect(student?.types.map((type) => type.days)).toEqual([1, 30]);
    expect(daysLabel(91, 'fr')).toBe('1 trimestre');
    expect(daysLabel(45, 'en')).toBe('45 days');
    expect(planCodeOf(365)).toBe('12m');
    expect(planCodeOf(14)).toBe('14d');
  });
});

describe('brouillon du catalogue (spec 005b, FR-003)', () => {
  const slug = 'kya-soldesign';
  const publish = async () => {
    const { revision } = await getCatalogEditing(db, slug);
    return publishCatalog(db, staff, slug, { expectedRevision: revision! });
  };

  it('rien n’est public avant la publication ; la publication applique tout et trace les changements', async () => {
    await changeCatalog(db, staff, slug, {
      changes: [
        {
          op: 'edition',
          code: 'partner',
          fields: {
            name: { fr: 'Partenaire', en: 'Partner' },
            audience: { fr: 'Distributeurs agréés KYA' },
            softwareEdition: 'commercial',
            features: ['system.aio', 'documents.word'],
            highlights: [{ fr: 'Support prioritaire' }],
          },
        },
        {
          op: 'license_type',
          edition: 'partner',
          fields: { name: { fr: 'Partenaire 1 an' }, nature: 'partner', days: 365, pricePerSeat: 0 },
        },
      ],
    });
    const editing = await getCatalogEditing(db, slug);
    expect(editing.revision).toBe(1);
    expect(editing.changes.map((change) => `${change.kind} ${change.scope}`)).toEqual(['added edition']);
    expect((await getCatalogProduct(db, slug))?.editions.map((edition) => edition.code)).not.toContain('partner');

    const published = await publish();
    expect(published.changes.length).toBeGreaterThan(0);
    const all = await getCatalogProduct(db, slug);
    const partner = all?.editions.find((edition) => edition.code === 'partner');
    expect(partner).toMatchObject({ visible: false, forSale: false, softwareEdition: 'commercial' });
    expect(partner?.types[0]).toMatchObject({ nature: 'partner', days: 365, visible: false });
    // Masquée : absente du site, présente pour l'équipe.
    const site = await getCatalogProduct(db, slug, { publicOnly: true });
    expect(site?.editions.map((edition) => edition.code)).toEqual(['commercial', 'academic', 'student']);
    const trace = await db.select().from(auditEvents).where(eq(auditEvents.action, 'catalog.published'));
    expect(trace.length).toBeGreaterThan(0);
    expect((await getCatalogEditing(db, slug)).revision).toBeNull();
  });

  it('refuse un profil inconnu du logiciel, une fonction inconnue et des postes incohérents', async () => {
    const attempt = (changes: unknown[]) => changeCatalog(db, staff, slug, { changes });
    await expect(attempt([{ op: 'edition', code: 'student', fields: { softwareEdition: 'pirate' } }])).rejects.toThrow(
      CatalogError,
    );
    await expect(attempt([{ op: 'edition', code: 'student', fields: { features: ['voler.lune'] } }])).rejects.toThrow(
      CatalogError,
    );
    const type = (await getCatalogProduct(db, slug))!.editions.find((edition) => edition.code === 'student')!.types[0]!;
    await expect(
      attempt([{ op: 'license_type', edition: 'student', id: type.id, fields: { seatsMin: 3 } }]),
    ).rejects.toMatchObject({ code: 'INVALID_CATALOG' });
    await expect(
      attempt([{ op: 'license_type', edition: 'student', id: type.id, fields: { pricePerSeat: -5 } }]),
    ).rejects.toThrow();
  });

  it('ordonne, archive et refuse de retirer ce qui a été publié', async () => {
    await changeCatalog(db, staff, slug, { changes: [{ op: 'move_edition', code: 'student', to: 0 }] });
    await expect(
      changeCatalog(db, staff, slug, { changes: [{ op: 'remove', edition: 'partner' }] }),
    ).rejects.toMatchObject({ code: 'NOT_REMOVABLE' });
    await changeCatalog(db, staff, slug, { changes: [{ op: 'edition', code: 'partner', fields: { archived: true } }] });
    await publish();
    const all = await getCatalogProduct(db, slug);
    expect(all?.editions[0]?.code).toBe('student');
    expect(all?.editions.find((edition) => edition.code === 'partner')?.archived).toBe(true);
    await changeCatalog(db, staff, slug, {
      changes: [
        { op: 'move_edition', code: 'commercial', to: 0 },
        { op: 'edition', code: 'partner', fields: { archived: false } },
      ],
    });
    await publish();
  });

  it('refuse une publication dont le brouillon a changé depuis sa lecture ; l’abandon efface le brouillon', async () => {
    const first = await changeCatalog(db, staff, slug, { changes: [{ op: 'product', fields: { monogram: 'SD' } }] });
    await changeCatalog(db, staff, slug, {
      changes: [{ op: 'product', fields: { monogram: 'KS' } }],
      expectedRevision: first.revision,
    });
    await expect(publishCatalog(db, staff, slug, { expectedRevision: first.revision })).rejects.toMatchObject({
      code: 'DRAFT_CONFLICT',
    });
    await expect(
      changeCatalog(db, staff, slug, {
        changes: [{ op: 'product', fields: { monogram: 'X' } }],
        expectedRevision: first.revision,
      }),
    ).rejects.toMatchObject({ code: 'DRAFT_CONFLICT' });
    expect(await discardCatalogDraft(db, staff, slug)).toBe(true);
    expect((await getCatalogEditing(db, slug)).revision).toBeNull();
    expect((await getCatalogProduct(db, slug))?.monogram).toBeNull();
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
