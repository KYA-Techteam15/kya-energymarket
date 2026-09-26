import { oauthProviderClient } from '@better-auth/oauth-provider/client';
import { adminClient, magicLinkClient, organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/**
 * Client navigateur de Better Auth (même origine : /api/auth). `oauthProviderClient` joint la requête
 * OAuth signée de la page (connexion, autorisation) pour poursuivre le parcours MCP (spec 003).
 */
export const authClient = createAuthClient({
  plugins: [organizationClient(), adminClient(), magicLinkClient(), oauthProviderClient()],
});
