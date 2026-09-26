// Contenu initial (spec 004, FR-010) : catalogue, images livrées, pages de KYA-SolDesign et de la
// marketplace, en français et en anglais. Idempotent : ce qui existe déjà n'est jamais remplacé.
//   pnpm db:seed            (base : DATABASE_URL, sinon celle de .env.local)
import { existsSync } from 'node:fs';
import { createDatabase } from '../packages/db/src/index.ts';
import { seedInitialContent } from '../packages/domain/src/index.ts';

const envFile = new URL('../.env.local', import.meta.url);
if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);
const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error('DATABASE_URL manquante (lancez pnpm env:link, ou fournissez-la pour la base visée).');
  process.exit(1);
}

const handle = createDatabase(url, { max: 1 });
try {
  const report = await seedInitialContent(handle.db);
  console.log(
    `Contenu initial : ${report.products} logiciel(s), ${report.editions} édition(s), ${report.plans} durée(s), ` +
      `${report.pages} page(s) publiée(s) ajoutés ; ${report.images} image(s) vérifiée(s). Rien d'existant n'a été remplacé.`,
  );
} finally {
  await handle.close();
}
