# Déploiement

Cible : **Coolify** (Coolify Cloud, équipe « KYA-TechTeam »), une image Docker de l'application
TanStack Start, un projet Coolify « KYA-EnergyMarket » avec une application par environnement.

## Chaîne prévue

1. Pull request `feat-NNN-nom → dev` : `pnpm verify` en CI, branche Neon `preview/<PR>`, migrations,
   déploiement de preview.
2. Fusion dans `dev` : déploiement de l'environnement de test.
3. `dev → main` avec étiquette `vX.Y.Z` : promotion de **la même image** en production après
   approbation, migrations exécutées par le pipeline.
4. Retour arrière : redéployer l'image précédente ; migrations additives pour rester compatibles.

## Ce que fixera la spécification 001

Dockerfile, contrôle de santé (`/api/health`), workflows GitHub Actions (qualité, preview,
promotion), création du projet Neon et des branches, création du projet Coolify, variables par
environnement.

## Ce qui reste à décider

Nom de domaine de production, fournisseur de courriel transactionnel, stockage objet des médias et
des factures (Neon Object Storage, Cloudflare R2 ou autre), sauvegardes et supervision.
