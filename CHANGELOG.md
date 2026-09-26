# Journal des versions

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions [SemVer](https://semver.org/lang/fr/).

## Non publié

### Ajouté

- Catalogue et pages composées (spécification 004) : logiciels, fonctions, éditions, durées et prix
  par poste en base ; 21 types de blocs issus de la maquette v5 (dont l'exemple interactif et le
  point juste réglable), Markdown assaini ; pages publiques Logiciels, KYA-SolDesign (Présentation,
  Tarifs, Ressources, Support, Guide) et marketplace (aide, à propos, contact, légal) en FR/EN ;
  tarifs et comparatif liés au catalogue ; administration du catalogue, éditeur de pages (brouillon,
  aperçu, publication, versions) et médiathèque (WebP, Neon Object Storage) ; outils MCP du
  catalogue et des pages (portées admin:catalog, admin:content) ; API GET /api/v1/catalog ;
  contenu initial pnpm db:seed.
- Serveur MCP et OAuth pour l'équipe KYA (spécification 003) : `/mcp` (Streamable HTTP, révisions
  2026-07-28 et 2025), OAuth 2.1 + PKCE par Better Auth (`@better-auth/mcp`), découverte RFC 9728 et
  RFC 8414, enregistrement dynamique et CIMD, jetons JWT de 15 minutes liés à `/mcp` ; rôle d'équipe
  vérifié à l'autorisation, à l'émission et à chaque appel ; outils `whoami`, `list_staff`,
  `find_customer` tracés dans l'audit ; page d'autorisation ; Administration → MCP (guide, clients
  autorisés, révocation immédiate). Guide : `docs/operations/mcp.md`.
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
