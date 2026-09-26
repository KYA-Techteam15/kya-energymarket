# Journal des versions

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions [SemVer](https://semver.org/lang/fr/).

## Non publié

### Ajouté

- Courriel transactionnel (spécification 002, avenant A) : paquet `@kya-em/mail` (SMTP, modèles
  français/anglais aux couleurs de la charte), confirmation d'adresse avant la première connexion,
  mot de passe oublié, lien de connexion par courriel, invitations envoyées par courriel, entrée dans
  l'équipe KYA par `pnpm staff:grant --site …` (compte ouvert, courriel de bienvenue).
- Comptes, organisations et rôles (spécification 002) : inscription et connexion par courriel et mot de
  passe (Better Auth), limitation des tentatives, organisation personnelle invisible, organisation
  d'entreprise créée à la demande, membres et invitations par lien, rôles d'équipe KYA (`kya_admin`,
  `kya_sales`, `kya_content`, `kya_support`), coquilles de l'espace client et de l'administration,
  menu « Mon espace », `pnpm staff:grant`, audit de chaque action ; parcours testés sur Postgres.
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
