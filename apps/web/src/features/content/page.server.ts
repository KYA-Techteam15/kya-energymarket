import { isStaff } from '@kya-em/auth';
import {
  collectMediaRefs,
  getPreviewPage,
  getPublishedPage,
  prepareBlocks,
  resolveMedia,
  type CatalogProduct,
  type Locale,
  type PageRef,
} from '@kya-em/domain';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { loadPublicProduct } from '@/features/catalog/catalog.server';
import { runtime } from '@/shared/server/runtime.server';

/** Valeur JSON : ce que les fonctions serveur transmettent au navigateur. */
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export interface PageBlock {
  readonly id: string;
  readonly type: string;
  readonly data: { [key: string]: Json };
}

async function viewerIsStaff() {
  const { auth } = runtime();
  if (!auth) return false;
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  return isStaff((session?.user as { role?: string | null } | undefined)?.role);
}

/**
 * Page composée prête à afficher (spec 004) : blocs préparés (Markdown rendu et assaini), médias
 * résolus dans la langue, offre du logiciel pour les blocs liés. L'aperçu d'un brouillon est réservé
 * à l'équipe KYA ; pour tout autre visiteur, la demande d'aperçu est ignorée.
 */
export async function loadComposedPage(input: { ref: PageRef; locale: Locale; preview: boolean }) {
  const { database } = runtime();
  if (!database) return null;
  const preview = input.preview && (await viewerIsStaff());
  const found = preview
    ? await getPreviewPage(database.db, input.ref, input.locale)
    : await getPublishedPage(database.db, input.ref, input.locale);
  if (!found) return null;
  const blocks = prepareBlocks(found.content.blocks, input.locale);
  const needsCatalog = found.content.blocks.some((block) => block.type === 'pricing' || block.type === 'comparison');
  const product: CatalogProduct | null =
    needsCatalog && input.ref.productSlug ? await loadPublicProduct(input.ref.productSlug) : null;
  const media = await resolveMedia(database.db, [...collectMediaRefs(found.content.blocks)], input.locale);
  return {
    title: found.content.title,
    description: found.content.description,
    fallback: found.fallback,
    preview,
    status: found.content.status,
    blocks: blocks as unknown as PageBlock[],
    product,
    media,
  };
}

export type ComposedPage = NonNullable<Awaited<ReturnType<typeof loadComposedPage>>>;
