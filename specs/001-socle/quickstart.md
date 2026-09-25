# Démarrage — Socle

Prérequis : Node 22.12 ou plus, pnpm 11, Git.

```bash
git clone https://github.com/KYA-Techteam15/kya-energymarket.git
cd kya-energymarket
pnpm install
```

## Secrets

Le fichier de secrets vit hors du dépôt (voir `docs/operations/secrets-et-environnements.md`).

```bash
# Chemin du fichier si ce n'est pas celui par défaut du responsable
set KYA_EM_SECRETS_FILE=C:\chemin\vers\kya-energy-market.env   # PowerShell : $env:KYA_EM_SECRETS_FILE="..."
pnpm env:link        # recopie le fichier vers .env.local (ignoré par Git)
```

## Base Neon (une fois, par le responsable)

```bash
pnpm neon:setup      # crée ou retrouve le projet « kya-energy-market » et ses branches main, dev, test,
                     # puis écrit NEON_PROJECT_ID, DATABASE_URL et DATABASE_MIGRATION_URL (branche dev)
                     # dans le fichier de secrets, sans rien afficher
pnpm env:link
pnpm db:migrate      # applique les migrations par la connexion directe
```

Sans base configurée, l'application démarre quand même en développement ; la santé indique
`not_configured`.

## Développer

```bash
pnpm dev             # http://localhost:3000 (français) et http://localhost:3000/en (anglais)
pnpm verify          # la porte de qualité complète
pnpm db:generate     # nouvelle migration après une modification du schéma
pnpm tokens          # régénère tokens.css depuis les jetons de la charte
```

## Image

```bash
docker build -t kya-energy-market .
docker run --rm -p 3000:3000 --env-file .env.local kya-energy-market
```
