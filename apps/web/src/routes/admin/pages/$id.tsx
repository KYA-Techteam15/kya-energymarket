import { createFileRoute, redirect } from '@tanstack/react-router';
import { getPageEditor } from '@/features/admin/content';
import { PageEditor } from '@/features/admin/editor/PageEditor';
import { m } from '@/paraglide/messages.js';

interface EditorSearch {
  readonly langue?: 'fr' | 'en';
}

export const Route = createFileRoute('/admin/pages/$id')({
  validateSearch: (search: Record<string, unknown>): EditorSearch => ({
    langue: search.langue === 'en' ? 'en' : search.langue === 'fr' ? 'fr' : undefined,
  }),
  loaderDeps: ({ search }) => ({ locale: search.langue ?? 'fr' }),
  loader: async ({ params, deps }) => {
    const editor = await getPageEditor({ data: { id: params.id, locale: deps.locale } });
    if (!editor) throw redirect({ to: '/admin/pages' });
    return editor;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.page.key ?? m.admin_pages()} · ${m.admin_pages()} — KYA-EnergyMarket` }],
  }),
  component: PageEditorRoute,
});

function PageEditorRoute() {
  const editor = Route.useLoaderData();
  return <PageEditor key={`${editor.page.id}-${editor.locale}`} editor={editor} />;
}
