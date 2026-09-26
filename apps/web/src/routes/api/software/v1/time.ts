import { createFileRoute } from '@tanstack/react-router';
import { preflight, serverTime } from '@/features/licensing/software.server';

// Heure du serveur : la référence du logiciel contre une horloge de poste reculée (spec 005).
export const Route = createFileRoute('/api/software/v1/time')({
  server: { handlers: { GET: () => serverTime(), OPTIONS: () => preflight() } },
});
