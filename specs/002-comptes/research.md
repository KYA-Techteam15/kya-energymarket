# Recherche — Comptes

Date : 2026-09-26.

## Better Auth 1.7 (ADR 0003 : confirmée)

- Bibliothèque auto-hébergée, données dans notre Neon via l'adaptateur Drizzle
  (`@better-auth/drizzle-adapter`, `provider: 'pg'`), schéma généré par la CLI `auth`.
- Intégration TanStack Start : route `/api/auth/$` qui délègue à `auth.handler(request)` ; plugin
  `tanstackStartCookies()` ; session serveur par `auth.api.getSession({ headers })` avec
  `getRequestHeaders()`.
- Plugin `organization` : organisations, membres, invitations (48 h par défaut, réglé à 7 jours),
  `creatorRole: 'owner'`, organisation active dans la session.
- Plugin `admin` + contrôle d'accès (`createAccessControl`) : rôle porté par le compte ; rôles
  d'équipe KYA définis comme rôles personnalisés.
- Plugin `magicLink` : lien à usage unique, envoi délégué à notre port `Mailer`.
- Serveur OAuth pour MCP : `@better-auth/oauth-provider` 1.7.6 existe (spécification 003).
- Le skill Neon `neon-auth` confirme que Neon Auth géré n'offre pas de fournisseur OAuth pour MCP :
  Better Auth auto-hébergé sur Neon est la voie recommandée dans ce cas.

## Base des tests de parcours

- CI : service `postgres:17` de GitHub Actions. Local : branche Neon `test` (URL écrite par
  `pnpm neon:setup`). Les tests de parcours qui demandent une base sont ignorés si aucune n'est fournie.
- Tests unitaires et d'intégration : PGlite, avec Better Auth branché dessus.
