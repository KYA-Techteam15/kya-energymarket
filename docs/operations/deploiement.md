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

Contenu initial (spec 004) : après la migration, `pnpm coolify:deploy` lance `pnpm db:seed` (catalogue,
pages FR/EN, images livrées). Rien de ce qui a été saisi dans l'administration n'est remplacé.

Médias (spec 004) : Neon Object Storage, seau privé `media` par branche (`neon buckets create media
--branch <branche>`, puis `neon env pull --service object-storage`). Les identifiants vont dans le
fichier de secrets avec le suffixe de l'environnement (`MEDIA_BUCKET_DEV`, `AWS_ACCESS_KEY_ID_DEV`,
`AWS_SECRET_ACCESS_KEY_DEV`, `AWS_ENDPOINT_URL_S3_DEV`, `AWS_REGION_DEV`) ; `pnpm coolify:deploy` les
recopie sans suffixe. La branche `dev` est prête ; `main` le sera à la mise en production.

Licences (spec 005) : une clé de signature par environnement, créée par
`pnpm license:keygen --env dev|production` (clé privée dans le fichier de secrets, clé publique dans
[cles-licences.md](cles-licences.md)) ; `pnpm coolify:deploy` recopie la clé de l'environnement. Ne
jamais la régénérer sans raison : les jetons déjà émis deviendraient invalides.

Premier administrateur d'un environnement :
`pnpm staff:grant --email <courriel> --role kya_admin --site <adresse de l'environnement>`, avec
`DATABASE_URL` de la base visée. Le compte est ouvert s'il n'existe pas et un courriel de bienvenue
mène au choix du mot de passe.

## Ce qui reste à décider

Nom de domaine de production, fournisseur de courriel définitif (le SMTP actuel est provisoire), stockage objet des médias et
des factures (Neon Object Storage, Cloudflare R2 ou autre), sauvegardes et supervision.
