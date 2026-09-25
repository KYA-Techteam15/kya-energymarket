// Déploie l'image publiée par la CI (ghcr.io) sur Coolify, pour un environnement donné.
//   node scripts/coolify-deploy.mjs --env dev --tag feat-001-socle
//   node scripts/coolify-deploy.mjs --env production --tag latest
// Étapes : URL Neon de la branche → migration (connexion directe) → projet, environnement et
// application Coolify → variables → déploiement → attente de /api/health.
// N'affiche JAMAIS de valeur secrète (constitution, III).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: { env: { type: 'string', default: 'dev' }, tag: { type: 'string' } },
});
const TARGETS = {
  dev: { coolifyEnvironment: 'dev', neonBranch: 'dev', tag: 'dev' },
  production: { coolifyEnvironment: 'production', neonBranch: 'main', tag: 'latest' },
};
const target = TARGETS[args.env];
if (!target) throw new Error(`Environnement inconnu : ${args.env} (dev ou production)`);
const tag = args.tag ?? target.tag;

const SECRETS = process.env.KYA_EM_SECRETS_FILE?.trim() || 'F:\\programmation\\perso\\.secrets\\kya-energy-market.env';
const IMAGE = 'ghcr.io/kya-techteam15/kya-energymarket';
const PROJECT = 'KYA-EnergyMarket';
const APP = `kya-energy-market-${args.env}`;
const DATABASE = 'kya_energy_market';
const ROLE = 'kya_app';

// ---------------------------------------------------------------- secrets
const readSecrets = () => {
  if (!existsSync(SECRETS)) throw new Error(`Fichier de secrets introuvable : ${SECRETS}`);
  return Object.fromEntries(
    readFileSync(SECRETS, 'utf8')
      .split(/\r?\n/u)
      .filter((line) => /^[A-Z][A-Z0-9_]*=/u.test(line))
      .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim()]),
  );
};
const writeSecret = (name, value) => {
  const text = readFileSync(SECRETS, 'utf8');
  const pattern = new RegExp(`^${name}=.*$`, 'mu');
  writeFileSync(
    SECRETS,
    pattern.test(text) ? text.replace(pattern, `${name}=${value}`) : `${text.trimEnd()}\n${name}=${value}\n`,
  );
};
const secrets = readSecrets();
for (const name of ['NEON_API_KEY', 'NEON_PROJECT_ID', 'COOLIFY_API_URL', 'COOLIFY_API_TOKEN']) {
  if (!secrets[name]) throw new Error(`${name} est vide dans le fichier de secrets.`);
}

// ---------------------------------------------------------------- clients HTTP
const call =
  (base, token) =>
  async (path, init = {}) => {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    const text = await response.text();
    if (!response.ok)
      throw new Error(`${init.method ?? 'GET'} ${path} : HTTP ${response.status} ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : {};
  };
const neon = call('https://console.neon.tech/api/v2', secrets.NEON_API_KEY);
const coolify = call(secrets.COOLIFY_API_URL.replace(/\/$/u, ''), secrets.COOLIFY_API_TOKEN);

// ---------------------------------------------------------------- Neon
const { branches } = await neon(`/projects/${secrets.NEON_PROJECT_ID}/branches`);
const branch = branches.find((candidate) => candidate.name === target.neonBranch);
if (!branch) throw new Error(`Branche Neon « ${target.neonBranch} » introuvable.`);
const strict = (uri) => uri.replace(/sslmode=require/u, 'sslmode=verify-full');
const neonUri = async (pooled) =>
  strict(
    (
      await neon(
        `/projects/${secrets.NEON_PROJECT_ID}/connection_uri?branch_id=${branch.id}&database_name=${DATABASE}&role_name=${ROLE}&pooled=${pooled}`,
      )
    ).uri,
  );
const databaseUrl = await neonUri(true);
const migrationUrl = await neonUri(false);
console.log(`Neon : branche « ${branch.name} » trouvée.`);

const migration = spawnSync('pnpm', ['--filter', '@kya-em/db', 'migrate'], {
  stdio: ['ignore', 'inherit', 'inherit'],
  shell: true,
  env: { ...process.env, DATABASE_MIGRATION_URL: migrationUrl },
});
if (migration.status !== 0) throw new Error('La migration a échoué.');

// ---------------------------------------------------------------- Coolify : projet, environnement, serveur
const projects = await coolify('/projects');
let project = projects.find((candidate) => candidate.name === PROJECT);
if (!project) {
  project = await coolify('/projects', {
    method: 'POST',
    body: JSON.stringify({ name: PROJECT, description: 'La marketplace des logiciels de KYA-Energy Group' }),
  });
  console.log(`Coolify : projet « ${PROJECT} » créé.`);
}
writeSecret('COOLIFY_PROJECT_UUID', project.uuid);

const projectDetail = await coolify(`/projects/${project.uuid}`);
if (!(projectDetail.environments ?? []).some((environment) => environment.name === target.coolifyEnvironment)) {
  await coolify(`/projects/${project.uuid}/environments`, {
    method: 'POST',
    body: JSON.stringify({ name: target.coolifyEnvironment }),
  });
  console.log(`Coolify : environnement « ${target.coolifyEnvironment} » créé.`);
}

const servers = await coolify('/servers');
const server = servers.find((candidate) => candidate.uuid === secrets.COOLIFY_SERVER_UUID) ?? servers[0];
if (!server) throw new Error('Aucun serveur Coolify disponible.');
writeSecret('COOLIFY_SERVER_UUID', server.uuid);

// ---------------------------------------------------------------- Coolify : application
const domain = `https://${APP}.${server.ip}.sslip.io`;
const applications = await coolify('/applications');
let application = applications.find((candidate) => candidate.name === APP);
if (!application) {
  application = await coolify('/applications/dockerimage', {
    method: 'POST',
    body: JSON.stringify({
      project_uuid: project.uuid,
      server_uuid: server.uuid,
      environment_name: target.coolifyEnvironment,
      name: APP,
      description: `KYA-EnergyMarket — ${args.env}`,
      docker_registry_image_name: IMAGE,
      docker_registry_image_tag: tag,
      ports_exposes: '3000',
      domains: domain,
      health_check_enabled: true,
      health_check_path: '/api/health',
      health_check_port: '3000',
      // « localhost » se résout en IPv6 dans l'image Alpine ; le serveur écoute en IPv4.
      health_check_host: '127.0.0.1',
      instant_deploy: false,
    }),
  });
  console.log(`Coolify : application « ${APP} » créée.`);
} else {
  await coolify(`/applications/${application.uuid}`, {
    method: 'PATCH',
    body: JSON.stringify({ docker_registry_image_tag: tag, health_check_host: '127.0.0.1' }),
  });
}

await coolify(`/applications/${application.uuid}/envs/bulk`, {
  method: 'PATCH',
  body: JSON.stringify({
    data: [
      { key: 'APP_ENV', value: 'production', is_preview: false },
      { key: 'APP_BASE_URL', value: domain, is_preview: false },
      { key: 'LOG_LEVEL', value: 'info', is_preview: false },
      { key: 'DATABASE_URL', value: databaseUrl, is_preview: false },
    ],
  }),
});
console.log('Coolify : variables APP_ENV, APP_BASE_URL, LOG_LEVEL, DATABASE_URL réglées.');

// ---------------------------------------------------------------- déploiement et santé
await coolify(`/deploy?uuid=${application.uuid}&force=true`, { method: 'POST' });
console.log(`Déploiement lancé : image ${IMAGE}:${tag} → ${domain}`);

for (let attempt = 0; attempt < 60; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 10_000));
  try {
    const response = await fetch(`${domain}/api/health`, { signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      const report = await response.json();
      console.log(`En ligne : ${domain} — santé ${report.status}, base ${report.checks?.database}`);
      process.exit(0);
    }
  } catch {
    // pas encore prêt
  }
}
console.error(`La santé ne répond pas encore après 10 minutes : voir les journaux de l'application dans Coolify.`);
process.exit(1);
