# Journal des versions

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions [SemVer](https://semver.org/lang/fr/).

## Non publié

### Ajouté

- Socle applicatif (spécification 001) : espace de travail pnpm, application TanStack Start (rendu
  serveur, serveur Node par Nitro), multilingue français/anglais par Paraglide (adresses `/fr`, `/en`,
  choix mémorisé, langue du navigateur), charte KYA (cinq couleurs du logo, teintes dérivées vérifiées
  AA, polices Poppins, Inter, JetBrains Mono servies localement), accueil de la marketplace fidèle à
  la maquette v5, page 404, santé `/api/health`, variables d'environnement validées, base Neon avec
  Drizzle (migrations par connexion directe), audit et journaux masqués, `pnpm verify`, CI GitHub,
  image Docker. Code rangé par fonctionnalité.
- Fondations du projet : documentation (produit, architecture, API et MCP, contrat KYA-SolDesign,
  paiements, contenus), décisions ADR 0001 à 0008, constitution Spec Kit, feuille de route,
  maquettes `design/v1` à `design/v5`.
