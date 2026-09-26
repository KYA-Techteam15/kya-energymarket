import { getCatalogProduct, listProducts } from '@kya-em/domain';
import { createFileRoute } from '@tanstack/react-router';
import { runtime } from '@/shared/server/runtime.server';

/**
 * API publique du catalogue (spec 004, FR-009 ; 005b) : logiciels visibles et, pour ceux qui sont
 * disponibles, éditions et types de licence visibles (achetables ou non). Textes dans les deux langues, montants en FCFA entiers.
 */
export const Route = createFileRoute('/api/v1/catalog')({
  server: {
    handlers: {
      GET: async () => {
        const { database } = runtime();
        if (!database) return Response.json({ error: 'CATALOG_UNAVAILABLE' }, { status: 503 });
        const summaries = await listProducts(database.db);
        const products = await Promise.all(
          summaries.map(async (summary) => {
            const offer =
              summary.status === 'available'
                ? await getCatalogProduct(database.db, summary.slug, { publicOnly: true })
                : null;
            return {
              slug: summary.slug,
              name: summary.name,
              status: summary.status,
              kind: summary.kind,
              summary: summary.summary,
              features: offer?.features ?? [],
              editions: (offer?.editions ?? []).map((edition) => ({
                code: edition.code,
                name: edition.name,
                audience: edition.audience,
                watermark: edition.watermark,
                graceDays: edition.graceDays,
                maxSeats: edition.maxSeats,
                maxProjects: edition.maxProjects,
                features: edition.features,
                highlights: edition.highlights,
                forSale: edition.forSale,
                types: edition.types.map((type) => ({
                  id: type.id,
                  name: type.name,
                  nature: type.nature,
                  days: type.days,
                  pricePerSeat: type.pricePerSeat,
                  currency: 'XOF',
                  indicative: type.indicative,
                  seatsMin: type.seatsMin,
                  seatsMax: type.seatsMax ?? edition.maxSeats,
                  forSale: edition.forSale && type.forSale,
                })),
              })),
            };
          }),
        );
        return Response.json(
          { products },
          { headers: { 'cache-control': 'public, max-age=60', 'access-control-allow-origin': '*' } },
        );
      },
    },
  },
});
