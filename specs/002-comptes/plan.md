# Plan d'implémentation : Comptes, organisations et rôles

**Branche** : `feat-002-comptes` · **Spécification** : [spec.md](spec.md) · **Recherche** : [research.md](research.md)

## Contexte technique

Better Auth 1.7 (adaptateur Drizzle, plugins `organization`, `admin`, `magicLink`,
`tanstackStartCookies`), Drizzle sur Neon, TanStack Start, Paraglide, charte `design/v5`.

## Contrôle de constitution

| Principe | Conformité |
|---|---|
| II. Une couche métier | `packages/auth` (configuration Better Auth), `packages/domain/src/accounts` (règles : organisation personnelle, rôles d'équipe) ; routes minces |
| III. Sécurité serveur | contrôles d'accès dans les `beforeLoad` serveur et les fonctions serveur ; cookies sécurisés ; limitation de débit ; mots de passe hachés par Better Auth ; aucun secret journalisé |
| IV. Données du client | données minimales ; organisation personnelle ne crée aucune donnée superflue |
| V. Terrain | pages légères, FR/EN, axe |
| VI. Qualité | tests d'intégration PGlite (inscription → organisation, rôles, audit), parcours Playwright sur Postgres |

## Structure

```text
packages/auth/src/
  createAuth.ts            configuration Better Auth (plugins, hooks → règles de domaine, audit)
  permissions.ts           contrôle d'accès : rôles d'équipe KYA
  mailer.ts                port Mailer + adaptateur de développement
packages/db/src/schema/
  audit.ts, auth.ts        un fichier de schéma par fonctionnalité
packages/domain/src/accounts/
  organizations.ts         organisation personnelle, visibilité, nature
  staff.ts                 rôles d'équipe, attribution
apps/web/src/features/
  auth/                    pages Se connecter, fonctions serveur de session, garde
  account/                 espace client : tableau de bord, organisation, invitation
  admin/                   coquille de l'administration, équipe
  shell/                   en-tête : menu « Mon espace »
apps/web/src/routes/
  api/auth/$.ts            gestionnaire Better Auth
  connexion.tsx, espace/*, admin/*, invitation/$id.tsx
scripts/staff-grant.mjs    premier administrateur
```

## Risques

| Risque | Parade |
|---|---|
| Pas de fournisseur de courriel | port `Mailer` ; fonctions désactivées proprement ; lien d'invitation affiché |
| Schéma généré par la CLI qui diverge | schéma Drizzle relu et versionné, migration Drizzle |
| Parcours e2e sans base | service Postgres en CI ; branche Neon `test` en local |
