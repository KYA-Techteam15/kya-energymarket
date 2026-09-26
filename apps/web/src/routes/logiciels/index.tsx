import { createFileRoute } from '@tanstack/react-router';
import { CatalogPage } from '@/features/catalog/CatalogPage';
import { getCatalogSummary } from '@/features/catalog/server';
import { baseUrlFrom, localizedLinks } from '@/features/i18n/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';

export const Route = createFileRoute('/logiciels/')({
  loader: () => getCatalogSummary({ data: { locale: getLocale() } }),
  head: ({ matches }) => ({
    meta: [{ title: `${m.catalog_title()} — KYA-EnergyMarket` }, { name: 'description', content: m.catalog_intro() }],
    links: localizedLinks('/logiciels', getLocale(), baseUrlFrom(matches)),
  }),
  component: CatalogRoute,
});

function CatalogRoute() {
  return <CatalogPage products={Route.useLoaderData()} />;
}
