import { createFileRoute, notFound } from '@tanstack/react-router';
import { baseUrlFrom, localizedLinks } from '@/features/i18n/seo';
import { getTrialPage } from '@/features/trial/trial';
import { TrialPage } from '@/features/trial/TrialPage';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';

interface TrialSearch {
  readonly logiciel?: string;
}

// Essai gratuit (spec 006) : page dédiée ; le logiciel par défaut est KYA-SolDesign.
export const Route = createFileRoute('/essai')({
  validateSearch: (search: Record<string, unknown>): TrialSearch => ({
    logiciel:
      typeof search.logiciel === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/u.test(search.logiciel)
        ? search.logiciel
        : undefined,
  }),
  loaderDeps: ({ search }) => ({ slug: search.logiciel ?? 'kya-soldesign' }),
  loader: async ({ deps }) => {
    const data = await getTrialPage({ data: { slug: deps.slug } });
    if (!data) throw notFound();
    return { data, slug: deps.slug };
  },
  head: ({ loaderData, matches }) => ({
    meta: [
      {
        title: `${m.trial_meta_title({ product: loaderData?.data.status.product.name ?? 'KYA-SolDesign' })} — KYA-EnergyMarket`,
      },
      { name: 'description', content: m.trial_intro() },
    ],
    links: localizedLinks('/essai', getLocale(), baseUrlFrom(matches)),
  }),
  component: TrialRoute,
});

function TrialRoute() {
  const { data, slug } = Route.useLoaderData();
  return <TrialPage key={`${slug}-${data.viewer?.email ?? ''}`} data={data} slug={slug} />;
}
