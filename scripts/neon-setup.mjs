// Crée ou retrouve le projet Neon « kya-energy-market » (organisation KYA) et ses branches main, dev,
// test ; écrit NEON_PROJECT_ID, DATABASE_URL (poolée) et DATABASE_MIGRATION_URL (directe) de la branche
// dev dans le fichier de secrets. N'affiche JAMAIS de valeur secrète (spec 001, FR-012).
// API : https://api-docs.neon.tech/reference/getting-started-with-neon-api
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const SECRETS = process.env.KYA_EM_SECRETS_FILE?.trim() || 'F:\\programmation\\perso\\.secrets\\kya-energy-market.env';
const PROJECT_NAME = 'kya-energy-market';
const REGION = 'aws-eu-central-1'; // Francfort : la région AWS de Neon la plus proche de l'Afrique de l'Ouest
const DATABASE = 'kya_energy_market';
const ROLE = 'kya_app';
const BRANCHES = ['dev', 'test'];

function readSecrets() {
  if (!existsSync(SECRETS)) throw new Error(`Fichier de secrets introuvable : ${SECRETS}`);
  const text = readFileSync(SECRETS, 'utf8');
  const values = Object.fromEntries(
    text
      .split(/\r?\n/u)
      .filter((line) => /^[A-Z][A-Z0-9_]*=/u.test(line))
      .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim()]),
  );
  return { text, values };
}

function writeSecret(name, value) {
  const { text } = readSecrets();
  const pattern = new RegExp(`^${name}=.*$`, 'mu');
  const next = pattern.test(text) ? text.replace(pattern, `${name}=${value}`) : `${text.trimEnd()}\n${name}=${value}\n`;
  writeFileSync(SECRETS, next);
}

const { values } = readSecrets();
const apiKey = values.NEON_API_KEY;
const orgId = values.NEON_ORG_ID;
if (!apiKey) {
  console.error(`NEON_API_KEY est vide dans ${SECRETS} : collez-y la clé API Neon de KYA.`);
  process.exit(1);
}
if (!orgId) {
  console.error('NEON_ORG_ID est vide dans le fichier de secrets.');
  process.exit(1);
}

async function neon(path, init = {}) {
  const response = await fetch(`https://console.neon.tech/api/v2${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`Neon ${init.method ?? 'GET'} ${path} : HTTP ${response.status}`);
  return response.json();
}

async function waitForOperations(projectId) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const { operations } = await neon(`/projects/${projectId}/operations?limit=20`);
    if (!operations.some((operation) => ['scheduling', 'running'].includes(operation.status))) return;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

const { projects } = await neon(`/projects?org_id=${orgId}&limit=100`);
let project = projects.find((candidate) => candidate.name === PROJECT_NAME);
if (project) {
  console.log(`Projet Neon « ${PROJECT_NAME} » retrouvé (${project.region_id}).`);
} else {
  const created = await neon('/projects', {
    method: 'POST',
    body: JSON.stringify({
      project: {
        name: PROJECT_NAME,
        region_id: REGION,
        org_id: orgId,
        pg_version: 17,
        branch: { name: 'main', database_name: DATABASE, role_name: ROLE },
      },
    }),
  });
  project = created.project;
  console.log(`Projet Neon « ${PROJECT_NAME} » créé (${REGION}).`);
}
await waitForOperations(project.id);

const { branches } = await neon(`/projects/${project.id}/branches`);
const main = branches.find((branch) => branch.default) ?? branches.find((branch) => branch.name === 'main');
for (const name of BRANCHES) {
  if (branches.some((branch) => branch.name === name)) {
    console.log(`Branche « ${name} » déjà présente.`);
    continue;
  }
  await neon(`/projects/${project.id}/branches`, {
    method: 'POST',
    body: JSON.stringify({ branch: { name, parent_id: main.id }, endpoints: [{ type: 'read_write' }] }),
  });
  console.log(`Branche « ${name} » créée depuis « ${main.name} ».`);
  await waitForOperations(project.id);
}

const { branches: all } = await neon(`/projects/${project.id}/branches`);
const dev = all.find((branch) => branch.name === 'dev');
const uri = async (pooled) =>
  (
    await neon(
      `/projects/${project.id}/connection_uri?branch_id=${dev.id}&database_name=${DATABASE}&role_name=${ROLE}&pooled=${pooled}`,
    )
  ).uri;

writeSecret('NEON_PROJECT_ID', project.id);
// Certificat vérifié (verify-full) : le sens de « require » change dans les prochaines versions de pg.
const strict = (value) => value.replace(/sslmode=require/u, 'sslmode=verify-full');
writeSecret('DATABASE_URL', strict(await uri(true)));
writeSecret('DATABASE_MIGRATION_URL', strict(await uri(false)));
console.log(
  `NEON_PROJECT_ID, DATABASE_URL (poolée) et DATABASE_MIGRATION_URL (directe) de la branche « dev » écrites dans ${SECRETS}.`,
);
console.log('Suite : pnpm env:link puis pnpm db:migrate.');
