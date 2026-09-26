# Tâches — Comptes, organisations et rôles

## Fondations
- [ ] T001 Dépendances Better Auth ; paquet `packages/auth` ; variables `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` validées
- [ ] T002 Schéma Drizzle par fonctionnalité (`schema/audit.ts`, `schema/auth.ts`) ; migration `0001_comptes`
- [ ] T003 Port `Mailer` et adaptateur de développement (FR-012)

## Histoire 1 — Comptes (P1)
- [ ] T010 `createAuth` : courriel + mot de passe, sessions, limitation de débit, cookies TanStack (FR-001, FR-011)
- [ ] T011 Route `/api/auth/$`, fonctions serveur `getViewer`, garde de l'espace (FR-006)
- [ ] T012 Page `Se connecter` (onglets connexion / création), fidèle à `design/v5` (FR-010)
- [ ] T013 En-tête : menu « Mon espace » (FR-008)

## Histoire 2 — Organisation invisible (P1)
- [ ] T020 Organisation personnelle à l'inscription, active dans la session (FR-002)
- [ ] T021 « Acheter pour une organisation » : création d'une organisation d'entreprise, rubrique visible

## Histoire 3 — Invitations (P2)
- [ ] T030 Inviter, lien à copier, accepter, retirer un membre ; règles propriétaire / membre (FR-003, FR-004)

## Histoire 4 — Équipe KYA (P2)
- [ ] T040 Rôles d'équipe (contrôle d'accès), garde `/admin` (FR-005, FR-006)
- [ ] T041 `pnpm staff:grant` (FR-007) ; administration : liste de l'équipe, attribution des rôles

## Histoire 5 — Lien de connexion (P3)
- [ ] T050 Plugin `magicLink` derrière le `Mailer`, masqué sans fournisseur

## Transverse
- [ ] T060 Audit de toutes les actions FR-009
- [ ] T061 Tests d'intégration (PGlite) et parcours (Postgres en CI, Neon `test` en local), axe
- [ ] T062 Messages FR/EN, documentation, `pnpm verify`, déploiement `dev`
