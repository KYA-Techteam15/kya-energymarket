import { createFileRoute, redirect } from '@tanstack/react-router';

// Ancienne adresse d'une licence (courriels, MCP, favoris) : la fiche s'ouvre dans la liste.
export const Route = createFileRoute('/admin/licences/$id')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/admin/licences', search: { licence: params.id } as never });
  },
});
