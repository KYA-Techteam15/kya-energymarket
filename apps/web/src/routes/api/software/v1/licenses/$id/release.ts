import { createFileRoute } from '@tanstack/react-router';
import { preflight, release } from '@/features/licensing/software.server';

// Le logiciel libère son poste : { deviceId } → 204 (spec 005).
export const Route = createFileRoute('/api/software/v1/licenses/$id/release')({
  server: {
    handlers: { POST: ({ request, params }) => release(request, params.id), OPTIONS: () => preflight() },
  },
});
