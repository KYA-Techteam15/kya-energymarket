import { adminClient, magicLinkClient, organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/** Client navigateur de Better Auth (même origine : /api/auth). */
export const authClient = createAuthClient({
  plugins: [organizationClient(), adminClient(), magicLinkClient()],
});
