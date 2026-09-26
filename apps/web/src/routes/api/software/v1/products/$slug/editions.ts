import { createFileRoute } from '@tanstack/react-router';
import { preflight, productEditions } from '@/features/licensing/software.server';

// Offre du logiciel au format EditionDescriptor, lue dans le catalogue (spec 005).
export const Route = createFileRoute('/api/software/v1/products/$slug/editions')({
  server: {
    handlers: { GET: ({ params }) => productEditions(params.slug), OPTIONS: () => preflight() },
  },
});
