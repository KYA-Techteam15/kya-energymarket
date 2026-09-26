import { createFileRoute } from '@tanstack/react-router';
import { activate, preflight } from '@/features/licensing/software.server';

// Activation par clé : { key, deviceId, deviceName? } → { token } | KEY_UNKNOWN | SEATS_EXHAUSTED (spec 005).
export const Route = createFileRoute('/api/software/v1/licenses/activate')({
  server: { handlers: { POST: ({ request }) => activate(request), OPTIONS: () => preflight() } },
});
