import { createFileRoute } from '@tanstack/react-router';
import { baseUrlFrom, localizedLinks } from '@/features/i18n/seo';
import { HomePage } from '@/features/marketplace/HomePage';
import { getLocale } from '@/paraglide/runtime.js';

export const Route = createFileRoute('/')({
  head: ({ matches }) => ({ links: localizedLinks('/', getLocale(), baseUrlFrom(matches)) }),
  component: HomePage,
});
