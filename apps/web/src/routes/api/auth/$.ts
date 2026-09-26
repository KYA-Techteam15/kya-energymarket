import { createFileRoute } from '@tanstack/react-router';
import { authHandler } from '@/features/auth/session.server';

// Better Auth : inscription, connexion, sessions, organisations, équipe (spec 002).
export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => authHandler(request),
      POST: ({ request }) => authHandler(request),
    },
  },
});
