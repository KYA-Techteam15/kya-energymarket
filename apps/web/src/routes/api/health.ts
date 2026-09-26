import { createFileRoute } from '@tanstack/react-router';
import { healthResponse } from '@/features/health/healthResponse.server';

// Contrat : specs/001-socle/contracts/health.md
export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () => healthResponse(),
    },
  },
});
