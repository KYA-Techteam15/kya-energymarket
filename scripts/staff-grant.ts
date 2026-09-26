// Attribue (ou retire avec --revoke) un rôle d'équipe KYA à un compte existant (spec 002, FR-007).
//   pnpm staff:grant --email afi@kya-energy.com --role kya_admin
//   pnpm staff:grant --email afi@kya-energy.com --role kya_support --revoke
// Base : DATABASE_URL de l'environnement, sinon celle de .env.local (développement). Aucune valeur secrète affichée.
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createDatabase } from '../packages/db/src/index.ts';
import { grantStaffRole, revokeStaffRole, StaffError, STAFF_ROLES } from '../packages/domain/src/index.ts';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    role: { type: 'string', default: 'kya_admin' },
    revoke: { type: 'boolean', default: false },
  },
});

const envFile = new URL('../.env.local', import.meta.url);
if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);
if (!values.email) {
  console.error(`Usage : pnpm staff:grant --email <courriel> --role <${STAFF_ROLES.join('|')}> [--revoke]`);
  process.exit(1);
}
const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error('DATABASE_URL manquante (lancez pnpm env:link, ou fournissez-la pour la base visée).');
  process.exit(1);
}

const handle = createDatabase(url, { max: 1 });
try {
  const change = values.revoke ? revokeStaffRole : grantStaffRole;
  const result = await change(handle.db, {
    email: values.email,
    role: values.role!,
    actor: { type: 'system', id: null },
  });
  console.log(`${values.email} : rôles d'équipe = ${result.roles.join(', ') || 'aucun'} (tracé dans l'audit).`);
} catch (error) {
  if (error instanceof StaffError) {
    const reasons = {
      ACCOUNT_NOT_FOUND: "aucun compte avec ce courriel : la personne doit d'abord créer son compte",
      UNKNOWN_ROLE: `rôle inconnu (${STAFF_ROLES.join(', ')})`,
      LAST_ADMIN: 'impossible de retirer le dernier administrateur',
    };
    console.error(`Refusé : ${reasons[error.code]}.`);
    process.exitCode = 1;
  } else throw error;
} finally {
  await handle.close();
}
