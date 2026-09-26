import { createFileRoute } from '@tanstack/react-router';
import { preflight, refresh } from '@/features/licensing/software.server';

// Rafraîchissement : { deviceId } → { token } | LICENSE_UNKNOWN | LICENSE_REVOKED | DEVICE_RELEASED (spec 005).
export const Route = createFileRoute('/api/software/v1/licenses/$id/refresh')({
  server: {
    handlers: { POST: ({ request, params }) => refresh(request, params.id), OPTIONS: () => preflight() },
  },
});
