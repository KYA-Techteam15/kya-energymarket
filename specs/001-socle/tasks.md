# Tâches — Socle

Légende : `[P]` parallélisable. Les numéros d'exigences renvoient à [spec.md](spec.md).

## Phase 1 — Espace de travail

- [ ] T001 Racine : `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `.nvmrc`, `tsconfig.base.json` (FR-001)
- [ ] T002 [P] Qualité : `eslint.config.js`, `prettier.config.js`, `.prettierignore`, `.secretlintrc.json`, `vitest.workspace` (FR-017)
- [ ] T003 [P] Scripts : `scripts/env-link.mjs` (FR-011), `scripts/check-branch.mjs` (FR-018)

## Phase 2 — Fondations partagées

- [ ] T010 `packages/config` : schéma Zod des variables, erreurs nommées sans valeur, tests (FR-010)
- [ ] T011 `packages/ui` : jetons de la charte (5 couleurs + dérivées), `scripts/tokens.mjs` → `tokens.css`, test de contraste AA et de dérive (FR-003, FR-004)
- [ ] T012 `packages/ui` : `base.css` (typographie, boutons, en-têtes, pied) repris de `design/v5`, polices locales (FR-005, FR-006)
- [ ] T013 `packages/db` : schéma `audit_events`, `drizzle.config.ts`, première migration, client `pg` poolé, base de test PGlite (FR-013, FR-014)
- [ ] T014 `packages/domain` : `recordAuditEvent`, `checkHealth`, tests sur PGlite (FR-014, FR-016)
- [ ] T015 Journaux pino avec masquage, test (FR-015)

## Phase 3 — Histoire 1 : accueil de la marketplace (P1)

- [ ] T020 Application TanStack Start : `vite.config.ts`, `router.tsx`, `server.ts`, `__root.tsx` (FR-002)
- [ ] T021 Icônes dessinées et composants : en-tête marketplace (menus Logiciels et langue, menu mobile), en-tête logiciel, pied de page, étiquette « exemple » (FR-006)
- [ ] T022 Page d'accueil : héros, logiciels, comment ça marche, KYA-Energy Group, questions (maquette v5)
- [ ] T023 Page 404 localisée (FR-020)

## Phase 4 — Histoire 2 : anglais (P1)

- [ ] T030 Paraglide : `project.inlang`, catalogues `fr.json` et `en.json`, stratégie url → cookie → navigateur → fr (FR-007, FR-008)
- [ ] T031 Sélecteur de langue mémorisé, `hreflang`, canonique (FR-009)
- [ ] T032 Test : mêmes clés dans les deux catalogues (SC-004)

## Phase 5 — Histoire 3 : démarrer et vérifier (P2)

- [ ] T040 `scripts/neon-setup.mjs` : projet et branches Neon via l'API, écriture des URL dans le fichier de secrets sans affichage (FR-012)
- [ ] T041 Commandes `db:generate`, `db:migrate` (connexion directe) (FR-013)
- [ ] T042 `pnpm verify` : format, lint, types, tests, construction, e2e, secrets (FR-017)

## Phase 6 — Histoire 4 : exploitation (P2)

- [ ] T050 Route `GET /api/health` selon le contrat (FR-016)
- [ ] T051 Tests Playwright : accueil FR/EN, bascule mémorisée, 404, santé, axe, mobile sans débordement (SC-001 à SC-004)
- [ ] T052 `Dockerfile` et `.dockerignore`, utilisateur non privilégié, contrôle de santé (FR-019)
- [ ] T053 `.github/workflows/quality.yml` : porte de qualité et sens des branches (FR-018)

## Phase 7 — Finition

- [ ] T060 Mettre à jour README, `docs/operations`, CHANGELOG ; passer `pnpm verify` au vert
- [ ] T061 Création du projet Neon (dès que la clé est fournie), migration appliquée sur `dev`
- [ ] T062 Déploiement Coolify (dès que Coolify a accès au dépôt)
