// Clé de signature des licences d'un environnement (spec 005, ADR 0006).
//   pnpm license:keygen --env dev          (--force pour remplacer une clé existante)
// La clé privée (JWK) va dans le fichier de secrets (LICENSE_SIGNING_PRIVATE_KEY_<ENV>), jamais
// affichée ; la clé publique, elle, s'affiche et s'inscrit dans docs/operations/cles-licences.md :
// c'est elle que KYA-SolDesign embarque. Remplacer une clé invalide les jetons déjà émis.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { generateSigningKey } from '../packages/domain/src/licenses/crypto.ts';

const { values } = parseArgs({
  options: { env: { type: 'string' }, force: { type: 'boolean', default: false } },
});
if (values.env !== 'dev' && values.env !== 'production') {
  console.error('Usage : pnpm license:keygen --env dev|production [--force]');
  process.exit(1);
}
const SECRETS = process.env.KYA_EM_SECRETS_FILE?.trim() || 'F:\\programmation\\perso\\.secrets\\kya-energy-market.env';
if (!existsSync(SECRETS)) {
  console.error(`Fichier de secrets introuvable : ${SECRETS}`);
  process.exit(1);
}
const suffix = values.env.toUpperCase();
const privateName = `LICENSE_SIGNING_PRIVATE_KEY_${suffix}`;
const idName = `LICENSE_SIGNING_KEY_ID_${suffix}`;
let text = readFileSync(SECRETS, 'utf8');
if (new RegExp(`^${privateName}=.+$`, 'mu').test(text) && !values.force) {
  console.error(
    `${privateName} existe déjà. Relancez avec --force pour la remplacer (les jetons émis deviendront invalides).`,
  );
  process.exit(1);
}

const { privateJwk, publicJwk } = await generateSigningKey();
const keyId = `${values.env}-${new Date().toISOString().slice(0, 10)}`;
const set = (name: string, value: string) => {
  const pattern = new RegExp(`^${name}=.*$`, 'mu');
  text = pattern.test(text) ? text.replace(pattern, () => `${name}=${value}`) : `${text.trimEnd()}\n${name}=${value}\n`;
};
if (!text.includes('# Licences : clés de signature'))
  text = `${text.trimEnd()}\n\n# Licences : clés de signature par environnement (spec 005)\n`;
set(privateName, `'${JSON.stringify(privateJwk)}'`);
set(idName, keyId);
writeFileSync(SECRETS, text);

const doc = new URL('../docs/operations/cles-licences.md', import.meta.url);
const header =
  '# Clés publiques des licences\n\nClés publiques (ECDSA P-256, JWK) qui vérifient les jetons émis par chaque environnement. KYA-SolDesign embarque celle de la production (`LICENSE_PUBLIC_KEY`, tâche T061). Les clés privées vivent dans le fichier de secrets et dans Coolify, jamais ici.\n';
const current = existsSync(doc) ? readFileSync(doc, 'utf8') : header;
const section = `\n## ${values.env} — \`${keyId}\`\n\n\`\`\`json\n${JSON.stringify(publicJwk, null, 2)}\n\`\`\`\n`;
const pattern = new RegExp(`\\n## ${values.env} — [\\s\\S]*?\`\`\`\\n(?=\\n## |$)`, 'u');
writeFileSync(doc, pattern.test(current) ? current.replace(pattern, section) : `${current.trimEnd()}\n${section}`);

console.log(`${privateName} et ${idName} rangées dans le fichier de secrets (valeur non affichée).`);
console.log(`Clé publique (${keyId}) :\n${JSON.stringify(publicJwk)}`);
