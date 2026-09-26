import { createFileRoute } from '@tanstack/react-router';
import { mcpHandler } from '@/features/mcp/handler.server';

// Serveur MCP distant, réservé à l'équipe KYA (spec 003) : Streamable HTTP, sans session serveur.
export const Route = createFileRoute('/mcp')({
  server: {
    handlers: {
      POST: ({ request }) => mcpHandler(request),
      GET: ({ request }) => mcpHandler(request),
      DELETE: ({ request }) => mcpHandler(request),
    },
  },
});
