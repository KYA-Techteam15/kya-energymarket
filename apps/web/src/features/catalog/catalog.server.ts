import { getCatalogProduct, listProducts, pick, type Locale } from '@kya-em/domain';
import { runtime } from '@/shared/server/runtime.server';

/** Résumé du catalogue pour l'en-tête, l'accueil, le pied de page et la page Logiciels. */
export async function loadCatalogSummary(locale: Locale) {
  const { database } = runtime();
  if (!database) return [];
  const products = await listProducts(database.db);
  return products.map((product) => ({
    slug: product.slug,
    name: product.name,
    status: product.status,
    kind: pick(product.kind, locale),
    summary: pick(product.summary, locale),
    logo: product.logo,
    monogram: product.monogram,
  }));
}

/** Offre publique d'un logiciel (éditions et durées actives), pour les blocs liés et l'API. */
export async function loadPublicProduct(slug: string) {
  const { database } = runtime();
  if (!database) return null;
  return getCatalogProduct(database.db, slug, { publicOnly: true });
}
