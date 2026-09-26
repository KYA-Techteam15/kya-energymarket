# Secrets et environnements

Aucune valeur secrète dans ce dépôt. Cette page dit **où** sont les clés et **comment** elles
arrivent dans l'application.

## Où sont les clés aujourd'hui

| Élément | Emplacement | Remarque |
|---|---|---|
| Secrets du poste local | `F:\programmation\perso\.secrets\kya-energy-market.env` | fichier du responsable, hors dépôt ; modèle sans valeurs : [`.env.example`](../../.env.example) |
| Clé API Neon de KYA | à coller dans ce fichier (`NEON_API_KEY`) | organisation Neon « techteam@kya-energy.com » (`org-snowy-poetry-15196989`), plan gratuit ; projets existants `KYA`, `KYA-Platform-Recette` |
| Jeton API Coolify | recopié dans ce fichier (`COOLIFY_API_TOKEN`) | Coolify Cloud (`app.coolify.io`), équipe « KYA-TechTeam » ; même équipe que le projet « KYA Platform » |
| Courriel SMTP | ce fichier (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`) | o2switch, `website@kya-energy.com`, provisoire ; valeur entre guillemets si elle contient des caractères spéciaux ; recopié dans Coolify par `pnpm coolify:deploy` |
| Médias (Neon Object Storage) | ce fichier, par environnement (`MEDIA_BUCKET_DEV`, `AWS_ACCESS_KEY_ID_DEV`, `AWS_SECRET_ACCESS_KEY_DEV`, `AWS_ENDPOINT_URL_S3_DEV`, `AWS_REGION_DEV`) | identifiants de la branche Neon, obtenus par `neon env pull --service object-storage` ; recopiés dans Coolify par `pnpm coolify:deploy` |
| Clés de signature des licences | ce fichier (`LICENSE_SIGNING_PRIVATE_KEY_DEV`, `_PRODUCTION`, et leurs `LICENSE_SIGNING_KEY_ID_*`) | créées par `pnpm license:keygen` ; clés publiques dans [cles-licences.md](cles-licences.md) |
| Identité Infisical | plus tard | kya-platform garde la sienne dans `.env.provisioner` à sa racine (non suivi) et ses secrets d'exécution dans Infisical |
| Secrets de CI | GitHub → dépôt → Settings → Secrets and variables → Actions | ajoutés par la spécification qui en a besoin |

Pour mémoire, kya-platform (`G:\Code\kya\digitalisation\kya-platform`) documente ses propres
variables Neon et Coolify dans `infra/providers.env.example`, `infra/neon/README.md`,
`infra/coolify/README.md` et `docs/operations/required-credentials.md`.

## Comment l'application les lit (spécification 001)

- Au développement, l'application lit `.env.local` à la racine du dépôt (ignoré par Git). Une commande
  `pnpm env:link` recopie le fichier de secrets du poste vers `.env.local` ; le chemin du fichier
  source se règle par la variable `KYA_EM_SECRETS_FILE`.
- Au démarrage, un schéma Zod valide les variables : une variable manquante arrête l'application avec
  son **nom**, jamais sa valeur.
- En CI et en production : variables injectées par GitHub Actions et Coolify, puis par Infisical.

## Environnements

| Environnement | Base Neon | URL | Secrets |
|---|---|---|---|
| local | branche `dev` ou Postgres local | `http://localhost:3000` | fichier du poste |
| test (CI) | branche `test`, remise à zéro | — | secrets GitHub |
| preview | branche `preview/<PR>`, éphémère | domaine Coolify de la preview | secrets GitHub / Coolify |
| production | branche `main` | domaine à choisir (`kya-energy-market.com` ?) | Coolify puis Infisical |

Chaque environnement a ses propres valeurs : jamais une clé personnelle ou de développement en
production.

## Règles

- Ne jamais afficher une valeur secrète dans un terminal, un journal, une réponse MCP ou un rapport :
  seulement le nom et « rempli » ou « vide ».
- Une clé exposée par erreur est révoquée et régénérée, puis remplacée partout où elle sert.
- Rotation : clés de licence avec une version du logiciel qui connaît les deux clés ; autres clés
  sans interruption grâce à la double lecture au démarrage.
