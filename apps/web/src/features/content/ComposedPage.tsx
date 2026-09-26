import type { PageBlock } from './page.server';
import { useState, type ComponentType } from 'react';
import { m } from '@/paraglide/messages.js';
import { CatalogContext, ComparisonBlock, NoteBandBlock, PricingBlock } from './blocks/CommerceBlocks';
import { FitChartBlock, InteractiveExampleBlock } from './blocks/InteractiveBlocks';
import {
  AudiencesBlock,
  ClosingBlock,
  DeliverablesBlock,
  FactsBlock,
  HeroBlock,
  ProofBlock,
  ScreenshotBlock,
  StepsBlock,
  TwoColumnsBlock,
} from './blocks/PresentationBlocks';
import { MediaContext, SearchContext } from './blocks/shared';
import {
  ContactWaysBlock,
  FaqBlock,
  MarkdownBlock,
  PageHeaderBlock,
  ReleasesBlock,
  ResourcesBlock,
  StartGuideBlock,
} from './blocks/TextBlocks';
import type { ComposedPage as ComposedPageData } from './page.server';

interface BlockProps {
  readonly data: Record<string, unknown>;
  readonly headingId: string;
  readonly anchor: string;
  readonly first: boolean;
}

/** Un type de bloc → son rendu. Un type inconnu du code n'est pas affiché. */
const RENDERERS: Record<string, ComponentType<BlockProps>> = {
  pageHeader: PageHeaderBlock,
  hero: HeroBlock,
  facts: FactsBlock,
  screenshot: ScreenshotBlock,
  twoColumns: TwoColumnsBlock,
  interactiveExample: InteractiveExampleBlock,
  fitChart: FitChartBlock,
  steps: StepsBlock,
  deliverables: DeliverablesBlock,
  audiences: AudiencesBlock,
  proof: ProofBlock,
  closing: ClosingBlock,
  pricing: PricingBlock,
  comparison: ComparisonBlock,
  noteBand: NoteBandBlock,
  faq: FaqBlock,
  markdown: MarkdownBlock,
  resources: ResourcesBlock,
  releases: ReleasesBlock,
  startGuide: StartGuideBlock,
  contactWays: ContactWaysBlock,
};

const anchorOf = (block: PageBlock) =>
  typeof block.data.anchor === 'string' && /^[\w-]{1,40}$/u.test(block.data.anchor)
    ? block.data.anchor
    : `b-${block.id}`;

/**
 * Page composée (spec 004, ADR 0008) : la liste des blocs, rendus dans les gabarits de design/v5.
 * Le premier bloc porte le titre de la page (h1) ; les autres ouvrent des sections (h2).
 */
export function ComposedPage({ page, edition }: { page: ComposedPageData; edition?: string }) {
  const [query, setQuery] = useState('');
  const [selected, select] = useState<string | undefined>(undefined);
  return (
    <MediaContext.Provider value={page.media}>
      <CatalogContext.Provider value={{ product: page.product, edition, selected, select }}>
        <SearchContext.Provider value={{ query, setQuery }}>
          {page.preview ? (
            <p className="preview-bar" role="status">
              {page.status === 'draft' ? m.content_preview_draft() : m.content_preview_published()}
            </p>
          ) : null}
          {page.fallback ? (
            <p className="wrap fallback-note" lang="fr">
              {m.content_fallback()}
            </p>
          ) : null}
          {page.blocks.map((block, index) => {
            const Renderer = RENDERERS[block.type];
            if (!Renderer) return null;
            // Le héros et l'en-tête de page portent le h1 quand ils ouvrent la page.
            const headingId = `t-${block.id}`;
            return (
              <Renderer
                key={block.id}
                data={block.data}
                headingId={headingId}
                anchor={anchorOf(block)}
                first={index === 0}
              />
            );
          })}
        </SearchContext.Provider>
      </CatalogContext.Provider>
    </MediaContext.Provider>
  );
}
