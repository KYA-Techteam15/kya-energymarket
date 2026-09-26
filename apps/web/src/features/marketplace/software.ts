import { useLoaderData } from '@tanstack/react-router';
import type { CatalogSummary } from '@/features/catalog/server';

/** Logiciels du catalogue (spec 004), chargés une fois par la route racine. */
export function useCatalog(): CatalogSummary {
  return useLoaderData({ from: '__root__' }).catalog;
}
