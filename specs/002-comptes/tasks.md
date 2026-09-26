# Tâches — Comptes, organisations et rôles

## Fondations
- [x] T001 Dépendances Better Auth ; paquet `packages/auth` ; variables `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` validées
- [x] T002 Schéma Drizzle par fonctionnalité (`schema/audit.ts`, `schema/auth.ts`) ; migration `0001_comptes`
- [x] T003 Port `Mailer` et adaptateur de développement (FR-012)

## Histoire 1 — Comptes (P1)
- [x] T010 `createAuth` : courriel + mot de passe, sessions, limitation de débit, cookies TanStack (FR-001, FR-011)
- [x] T011 Route `/api/auth/$`, fonctions serveur `getViewer`, garde de l'espace (FR-006)
- [x] T012 Page `Se connecter` (onglets connexion / création), fidèle à `design/v5` (FR-010)
- [x] T013 En-tête : menu « Mon espace » (FR-008)

## Histoire 2 — Organisation invisible (P1)
- [x] T020 Organisation personnelle à l'inscription, active dans la session (FR-002)
- [x] T021 « Acheter pour une organisation » : création d'une organisation d'entreprise, rubrique visible

## Histoire 3 — Invitations (P2)
- [x] T030 Inviter, lien à copier, accepter, retirer un membre ; règles propriétaire / membre (FR-003, FR-004)

## Histoire 4 — Équipe KYA (P2)
- [x] T040 Rôles d'équipe (contrôle d'accès), garde `/admin` (FR-005, FR-006)
- [x] T041 `pnpm staff:grant` (FR-007) ; administration : liste de l'équipe, attribution des rôles

## Histoire 5 — Lien de connexion (P3)
- [x] T050 Plugin `magicLink` derrière le `Mailer`, masqué sans fournisseur

## Transverse
- [x] T060 Audit de toutes les actions FR-009
- [x] T061 Tests d'intégration (PGlite) et parcours (Postgres en CI, Neon `test` en local), axe
- [x] T062 Messages FR/EN, documentation, `pnpm verify`, déploiement `dev`

## Avenant A — Courriel transactionnel
- [x] T070 Paquet `@kya-em/mail` : port, SMTP, journal, boîte d'envoi, mémoire ; variables `SMTP_*` (FR-014)
- [x] T071 Modèles FR/EN texte et HTML (charte KYA), langue de la requête (FR-015)
- [x] T072 Confirmation d'adresse obligatoire avec courriel, écran « Vérifiez votre boîte », renvoi (FR-016)
- [x] T073 Page « Mot de passe oublié » et choix du nouveau mot de passe (FR-017)
- [x] T074 Invitations par courriel (FR-018) ; `staff:grant` ouvre le compte et envoie la bienvenue (FR-019)
- [x] T075 Tests : intégration (PGlite + boîte mémoire), parcours (boîte d'envoi fichier) ; déploiement `dev` avec SMTP

## Écarts constatés pendant l'implémentation

- Le crochet de création de session ne fait que **lire** l'organisation retenue : écrire à ce moment (organisation, membre) attend la validation du compte encore en cours et bloque l'inscription sur Postgres (invisible sur PGlite, qui n'a qu'une connexion). L'organisation personnelle est créée après le compte ; l'interface vise explicitement l'organisation d'entreprise.
- Cache de session dans le cookie **désactivé** : un rôle retiré ou une organisation changée vaut dès la requête suivante.
- Code serveur rangé dans des modules `*.server.ts` : la protection d'imports de TanStack Start refuse qu'il parte au navigateur.
- Délai de connexion à la base porté à 15 s : Neon réveille une base en veille.
- Parcours de comptes sur un Postgres réel : conteneur `postgres:17` en CI, branche Neon `test` en local.
