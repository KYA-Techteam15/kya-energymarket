// Attribue (ou retire avec --revoke) un rôle d'équipe KYA (spec 002, FR-007 et avenant A).
//   pnpm staff:grant --email afi@kya-energy.com --role kya_admin
//   pnpm staff:grant --email afi@kya-energy.com --role kya_support --revoke
// Sans compte pour ce courriel, il est ouvert et un courriel de bienvenue mène au choix du mot de
// passe ; il faut alors le SMTP et l'adresse du site visé :
//   pnpm staff:grant --email afi@kya-energy.com --role kya_admin --site https://… [--name "Afi Kodjo"] [--lang en]
// Base : DATABASE_URL de l'environnement, sinon celle de .env.local (développement). Aucune valeur secrète affichée.
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createAuth, inviteStaffMember } from '../packages/auth/src/index.ts';
import { loadServerEnv, smtpConfigOf } from '../packages/config/src/index.ts';
import { createDatabase } from '../packages/db/src/index.ts';
import {
  accountIdByEmail,
  createLogger,
  grantStaffRole,
  isStaffRole,
  revokeStaffRole,
  StaffError,
  STAFF_ROLES,
} from '../packages/domain/src/index.ts';
import { createSmtpMailer } from '../packages/mail/src/index.ts';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    role: { type: 'string', default: 'kya_admin' },
    revoke: { type: 'boolean', default: false },
    site: { type: 'string' },
    name: { type: 'string' },
    lang: { type: 'string', default: 'fr' },
  },
});

const envFile = new URL('../.env.local', import.meta.url);
if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);
if (!values.email) {
  console.error(
    `Usage : pnpm staff:grant --email <courriel> --role <${STAFF_ROLES.join('|')}> [--revoke] [--site <adresse>] [--name <nom>]`,
  );
  process.exit(1);
}
const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error('DATABASE_URL manquante (lancez pnpm env:link, ou fournissez-la pour la base visée).');
  process.exit(1);
}

const email = values.email.trim().toLowerCase();
const actor = { type: 'system' as const, id: null };
const handle = createDatabase(url, { max: 1 });

async function invite() {
  if (!isStaffRole(values.role!)) throw new StaffError('UNKNOWN_ROLE');
  const env = loadServerEnv({ ...process.env, APP_ENV: 'development' });
  const smtp = smtpConfigOf(env);
  if (!values.site || !smtp) {
    console.error(
      "Aucun compte avec ce courriel. Pour l'ouvrir et envoyer le courriel de bienvenue, il faut --site <adresse du site> et les variables SMTP_*.",
    );
    process.exitCode = 1;
    return;
  }
  const baseUrl = new URL(values.site).origin;
  const mailer = createSmtpMailer(smtp, createLogger({ level: 'warn' }));
  const auth = createAuth({
    db: handle.db,
    // Rien n'est signé ici (compte, rôle, jeton en base) : un secret jetable suffit.
    secret: randomBytes(32).toString('base64url'),
    baseUrl,
    environment: 'development',
    mailer,
    tanstackCookies: false,
  });
  const result = await inviteStaffMember(
    { auth, db: handle.db, mailer, baseUrl },
    { email, role: values.role, name: values.name, locale: values.lang === 'en' ? 'en' : 'fr', actor },
  );
  console.log(
    `${email} : compte ouvert, rôles d'équipe = ${result.roles.join(', ')}, courriel de bienvenue envoyé (lien vers ${baseUrl}, 72 h). Tracé dans l'audit.`,
  );
}

try {
  if (!values.revoke && !(await accountIdByEmail(handle.db, email))) {
    await invite();
  } else {
    const change = values.revoke ? revokeStaffRole : grantStaffRole;
    const result = await change(handle.db, { email, role: values.role!, actor });
    console.log(`${email} : rôles d'équipe = ${result.roles.join(', ') || 'aucun'} (tracé dans l'audit).`);
  }
} catch (error) {
  if (error instanceof StaffError) {
    const reasons = {
      ACCOUNT_NOT_FOUND: 'aucun compte avec ce courriel',
      UNKNOWN_ROLE: `rôle inconnu (${STAFF_ROLES.join(', ')})`,
      LAST_ADMIN: 'impossible de retirer le dernier administrateur',
    };
    console.error(`Refusé : ${reasons[error.code]}.`);
    process.exitCode = 1;
  } else throw error;
} finally {
  await handle.close();
}
