# Déploiement

Cible : **Coolify** (Coolify Cloud, équipe « KYA-TechTeam »), une image Docker de l'application
TanStack Start, un projet Coolify « KYA-EnergyMarket » avec une application par environnement.

## Chaîne en place (spécification 001)

Coolify **ne lit pas le dépôt** : il déploie l'image que la CI a construite et testée.

1. Chaque poussée sur `feat-*`, `dev` ou `main` lance la porte de qualité (`pnpm verify`) ; si elle
   est verte, la CI publie l'image `ghcr.io/kya-techteam15/kya-energymarket` avec les étiquettes du nom
   de branche, `sha-<commit>` et, sur `main`, `latest`.
2. `pnpm coolify:deploy --env dev --tag <étiquette>` (ou `--env production --tag latest`) :
   - lit l'URL de la branche Neon correspondante (`dev` ou `main`) et applique les migrations par la
     connexion directe ;
   - crée au besoin le projet Coolify « KYA-EnergyMarket », l'environnement et l'application
     `kya-energy-market-<env>` sur « KYA-Server » ;
   - règle `APP_ENV`, `APP_BASE_URL`, `LOG_LEVEL` et `DATABASE_URL` (poolée) sans les afficher ;
   - lance le déploiement et attend `/api/health`.
3. La même image passe de `dev` à `production` : l'adresse publique et la base arrivent par les
   variables d'environnement au démarrage.
4. Retour arrière : redéployer l'étiquette `sha-<commit>` précédente ; migrations additives.

Adresses : `https://kya-energy-market-<env>.<ip-du-serveur>.sslip.io` en attendant le domaine. Environnement
`dev` : https://kya-energy-market-dev.13.140.178.49.sslip.io.

Contrôle de santé Coolify : hôte `127.0.0.1` (dans l'image Alpine, `localhost` se résout en IPv6 alors que le
serveur écoute en IPv4). L'API de Coolify lance un déploiement par `POST /deploy`.

Courriel : `pnpm coolify:deploy` recopie les variables `SMTP_*` du fichier de secrets quand elles sont
toutes remplies (sinon l'application tourne sans courriel : ni confirmation d'adresse, ni lien de
connexion). Aujourd'hui, SMTP o2switch de KYA (`website@kya-energy.com`), provisoire.

Premier administrateur d'un environnement :
`pnpm staff:grant --email <courriel> --role kya_admin --site <adresse de l'environnement>`, avec
`DATABASE_URL` de la base visée. Le compte est ouvert s'il n'existe pas et un courriel de bienvenue
mène au choix du mot de passe.

## Ce qui reste à décider

Nom de domaine de production, fournisseur de courriel définitif (le SMTP actuel est provisoire), stockage objet des médias et
des factures (Neon Object Storage, Cloudflare R2 ou autre), sauvegardes et supervision.
