import { defineConfig } from 'drizzle-kit';

// `drizzle-kit generate` n'a pas besoin de base : il compare le schéma aux migrations existantes.
// Les migrations s'appliquent avec `pnpm db:migrate` (src/migrate.ts), par la connexion directe.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
