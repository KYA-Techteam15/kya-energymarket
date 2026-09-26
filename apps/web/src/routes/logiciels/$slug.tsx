import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';
import { ProductHeader } from '@/features/catalog/ProductHeader';
import { getProductSummary } from '@/features/catalog/server';
import { getLocale } from '@/paraglide/runtime.js';

// Logiciel disponible : en-tête à quatre onglets au-dessus de chaque page (spec 004).
export const Route = createFileRoute('/logiciels/$slug')({
  loader: async ({ params }) => {
    const product = await getProductSummary({ data: { slug: params.slug, locale: getLocale() } });
    if (!product) throw notFound();
    return product;
  },
  component: ProductLayout,
});

function ProductLayout() {
  const product = Route.useLoaderData();
  return (
    <>
      <ProductHeader slug={product.slug} name={product.name} logo={product.logo} monogram={product.monogram} />
      <Outlet />
    </>
  );
}
