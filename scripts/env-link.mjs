// Recopie le fichier de secrets du poste vers .env.local (ignoré par Git). N'affiche aucune valeur.
// Source : KYA_EM_SECRETS_FILE, sinon l'emplacement du responsable (docs/operations/secrets-et-environnements.md).
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DEFAULT_SOURCE = 'F:\\programmation\\perso\\.secrets\\kya-energy-market.env';
const source = process.env.KYA_EM_SECRETS_FILE?.trim() || DEFAULT_SOURCE;
const target = fileURLToPath(new URL('../.env.local', import.meta.url));

if (!existsSync(source)) {
  console.error(`Fichier de secrets introuvable : ${source}`);
  console.error('Indiquez son chemin dans la variable KYA_EM_SECRETS_FILE.');
  process.exit(1);
}

copyFileSync(source, target);

const status = readFileSync(target, 'utf8')
  .split(/\r?\n/u)
  .filter((line) => /^[A-Z][A-Z0-9_]*=/u.test(line))
  .map((line) => {
    const [name, ...rest] = line.split('=');
    return `${name} ${rest.join('=').trim() ? 'rempli' : 'vide'}`;
  });
console.log(`.env.local mis à jour depuis le fichier de secrets.\n  ${status.join('\n  ')}`);
