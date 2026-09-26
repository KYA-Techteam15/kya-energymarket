# Plan d'implémentation : Serveur MCP et OAuth

**Branche** : `feat-003-mcp` · **Spécification** : [spec.md](spec.md) · **Recherche** : [research.md](research.md)

## Contrôle de constitution

| Principe | Conformité |
|---|---|
| II. Une couche métier | outils MCP = services de `@kya-em/domain` (équipe, comptes) ; aucune requête SQL dans les outils |
| III. Sécurité serveur | jetons courts liés à `/mcp`, PKCE, rôle d'équipe vérifié à l'émission et à chaque appel, audit, aucune valeur secrète en réponse |
| IV. Données du client | `find_customer` rend le minimum (nom, courriel, date, organisations d'entreprise) |
| VI. Qualité | intégration (PGlite : refus d'un client, outils) ; parcours Playwright OAuth complet sur la version construite |

## Structure

```text
packages/auth/src/
  createAuth.ts           + jwt(), mcp(), cimd() ; refus des comptes hors équipe à l'émission
  mcp.ts                  portées, ressource, revendication des rôles
packages/domain/src/accounts/
  customers.ts            findCustomers (recherche minimale)
apps/web/src/features/mcp/
  tools.server.ts         fabrique McpServer : whoami, list_staff, find_customer ; audit
  handler.server.ts       requireMcpAuth + createMcpHandler ; rôle relu en base
  consent.server.ts       client public, droit d'autoriser ; clients autorisés
  ConsentPage.tsx         page d'autorisation
  McpAdminPage.tsx        guide et clients autorisés
apps/web/src/routes/
  mcp.ts                  POST/GET/DELETE /mcp
  [.]well-known/$.ts      découverte OAuth à la racine
  mcp/autoriser.tsx       page d'autorisation
  admin/mcp.tsx           administration
docs/operations/mcp.md    guide de connexion Claude et Codex
```

## Risques

| Risque | Parade |
|---|---|
| Clients IA sur des révisions MCP différentes | service 2026-07-28 et 2025 sans état par le même serveur |
| Jeton émis à un client par contournement de la page | refus dans `customAccessTokenClaims`, rôle relu à chaque appel |
| SSRF par les documents CIMD | transport `@better-auth/cimd/node` (DNS épinglé, pas de redirection) |
