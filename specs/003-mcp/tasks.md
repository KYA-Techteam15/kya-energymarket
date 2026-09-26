# Tâches — Serveur MCP et OAuth

## Fondations
- [x] T001 Dépendances `@better-auth/mcp`, `@better-auth/cimd`, `@better-auth/oauth-provider`, `@modelcontextprotocol/server`
- [x] T002 Plugins `jwt`, `mcp`, `cimd` ; schéma (`pnpm auth:schema`) et migration
- [x] T003 Route racine `/.well-known/*` ; le serveur ne localise ni `/mcp` ni `/.well-known`

## Histoire 1 — Connecter Claude ou Codex (P1)
- [x] T010 `/mcp` : `requireMcpAuth` + `createMcpHandler` (2026-07-28 et 2025 sans état)
- [x] T011 Connexion pendant l'autorisation (requête signée, poursuite du parcours)
- [x] T012 Page d'autorisation FR/EN

## Histoire 2 — Réservé à l'équipe KYA (P1)
- [x] T020 Refus à l'émission du jeton hors équipe (code et rafraîchissement) ; page d'autorisation qui ne propose que « Refuser »
- [x] T021 Rôle relu en base à chaque appel `/mcp`

## Histoire 3 — Outils (P1)
- [x] T030 `whoami`, `list_staff`, `find_customer` ; audit `mcp.tool_called`

## Histoire 4 — Administration (P2)
- [x] T040 Page « MCP » : adresse, guide, clients autorisés, révocation

## Transverse
- [x] T050 Tests d'intégration (PGlite) et parcours OAuth complet (Playwright)
- [x] T051 Guide `docs/operations/mcp.md`, `api-et-mcp.md`, journal, feuille de route ; déploiement `dev`
