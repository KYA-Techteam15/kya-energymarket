import type { LinkValue, RenderedMarkdown, ResolvedMedia } from '@kya-em/domain';
import { ExampleTag, Icon, type IconName } from '@kya-em/ui';
import { Link } from '@tanstack/react-router';
import { createContext, useContext, type ReactNode } from 'react';
import { m } from '@/paraglide/messages.js';
import { parseSearch } from '@/shared/search';

/** Médias résolus de la page, partagés par tous ses blocs. */
export const MediaContext = createContext<Record<string, ResolvedMedia>>({});

/** Recherche en haut de page : filtre les questions de la page (support, aide). */
export const SearchContext = createContext<{ query: string; setQuery: (value: string) => void }>({
  query: '',
  setQuery: () => {},
});

export const useMedia = (ref: unknown): ResolvedMedia | null => {
  const media = useContext(MediaContext);
  return typeof ref === 'string' ? (media[ref] ?? null) : null;
};

export function Media({
  value,
  className,
  eager,
  sizes,
  alt,
}: {
  value: unknown;
  className?: string;
  eager?: boolean;
  sizes?: string;
  /** Texte alternatif imposé ('' : image décorative). */
  alt?: string;
}) {
  const media = useMedia(value);
  if (!media) return null;
  return (
    <img
      className={className}
      src={media.src}
      alt={alt ?? media.alt}
      width={media.width ?? undefined}
      height={media.height ?? undefined}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      sizes={sizes}
    />
  );
}

/**
 * Lien d'un bloc : chemin interne par le routeur (adresse localisée /fr, /en), ancre sur la page,
 * lien externe dans un nouvel onglet sans donner la main à la page cible.
 */
export function SmartLink({
  link,
  className,
  children,
}: {
  link: LinkValue | undefined;
  className?: string;
  children?: ReactNode;
}) {
  if (!link) return null;
  const content = children ?? link.label;
  if (link.href.startsWith('/')) {
    const url = new URL(link.href, 'https://kya.local');
    return (
      <Link
        to={url.pathname as '/'}
        search={parseSearch(url.search) as never}
        hash={url.hash ? url.hash.slice(1) : undefined}
        className={className}
      >
        {content}
      </Link>
    );
  }
  const external = link.href.startsWith('https:');
  return (
    <a href={link.href} className={className} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {content}
    </a>
  );
}

export const Example = ({ show }: { show?: unknown }) => (show ? <ExampleTag label={m.example()} /> : null);

/** HTML produit et assaini par le serveur (`@kya-em/domain`, renderMarkdown). */
export function Markdown({
  value,
  className,
  as = 'div',
}: {
  value: unknown;
  className?: string;
  as?: 'div' | 'span';
}) {
  const rendered = value as RenderedMarkdown | undefined;
  if (!rendered?.html) return null;
  const Tag = as;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: rendered.html }} />;
}

export const asList = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
export const text = (value: unknown) => (typeof value === 'string' ? value : '');
export const icon = (value: unknown, fallback: IconName = 'check'): IconName =>
  typeof value === 'string' ? (value as IconName) : fallback;
export { Icon };
