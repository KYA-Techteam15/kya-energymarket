// Configuration minimale, lue par la CLI Better Auth pour générer le schéma Drizzle des tables
// d'authentification (`pnpm auth:schema`). Mêmes plugins que src/createAuth.ts, sans base réelle.
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { admin, magicLink, organization } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/node-postgres';
import { ac, roles } from './src/permissions.ts';

export const auth = betterAuth({
  database: drizzleAdapter(drizzle('postgresql://localhost/schema-only'), { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  plugins: [organization(), admin({ ac, roles }), magicLink({ sendMagicLink: async () => {} })],
});
