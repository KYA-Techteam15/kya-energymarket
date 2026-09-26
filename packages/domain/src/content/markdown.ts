import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';

/**
 * Markdown des pages (spec 004, FR-004) : CommonMark + tableaux, rendu côté serveur. Le HTML brut est
 * échappé (`html: false`), jamais interprété ; les liens `javascript:`, `vbscript:`, `data:` et
 * `file:` sont refusés ; les liens externes s'ouvrent avec `rel="noopener noreferrer"`. Les titres
 * reçoivent une ancre, qui alimente le sommaire.
 */
export interface TocEntry {
  readonly level: number;
  readonly id: string;
  readonly text: string;
}

const UNSAFE_LINK = /^\s*(javascript|vbscript|data|file):/iu;

export const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '')
    .slice(0, 60) || 'section';

function createRenderer() {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false, breaks: false });
  md.validateLink = (url) => !UNSAFE_LINK.test(url);
  md.use(anchor, { slugify, level: [2, 3], tabIndex: false });

  const defaultLinkOpen =
    md.renderer.rules.link_open ?? ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));
  md.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const href = String(tokens[index]?.attrGet('href') ?? '');
    // Lien interne : adresse dans la langue de la page (/fr/aide, /en/aide).
    const locale = (env as { locale?: string } | undefined)?.locale;
    if (locale && /^\/(?!\/)/u.test(href) && !/^\/(fr|en)(\/|$|\?|#)/u.test(href)) {
      tokens[index]?.attrSet('href', `/${locale}${href}`);
    }
    if (/^https?:\/\//iu.test(href)) {
      tokens[index]?.attrSet('rel', 'noopener noreferrer');
      tokens[index]?.attrSet('target', '_blank');
    }
    return defaultLinkOpen(tokens, index, options, env, self);
  };
  // Tableaux défilables sur mobile, sans débordement de la page.
  md.renderer.rules.table_open = () => '<div class="md-table"><table>';
  md.renderer.rules.table_close = () => '</table></div>';
  return md;
}

const renderer = createRenderer();

export function renderMarkdown(
  source: string,
  options: { locale?: 'fr' | 'en' } = {},
): { html: string; toc: TocEntry[] } {
  const env = { locale: options.locale };
  const tokens = renderer.parse(source, env);
  const toc: TocEntry[] = [];
  tokens.forEach((token, index) => {
    if (token.type !== 'heading_open') return;
    const level = Number(token.tag.slice(1));
    const id = token.attrGet('id') === null ? null : String(token.attrGet('id'));
    const text = tokens[index + 1]?.content ?? '';
    if (id && (level === 2 || level === 3)) toc.push({ level, id, text });
  });
  return { html: renderer.renderer.render(tokens, renderer.options, env), toc };
}

/** Markdown d'une ligne (phrase de lecture, courte réponse) : sans paragraphe englobant. */
export const renderInlineMarkdown = (source: string) => renderer.renderInline(source);
