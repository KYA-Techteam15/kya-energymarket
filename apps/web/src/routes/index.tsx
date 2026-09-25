import { createFileRoute } from '@tanstack/react-router';
import { localizedLinks } from '@/features/i18n/seo';
import { HomePage } from '@/features/marketplace/HomePage';
import { getLocale } from '@/paraglide/runtime.js';

export const Route = createFileRoute('/')({
  head: () => ({ links: localizedLinks('/', getLocale()) }),
  component: HomePage,
});
