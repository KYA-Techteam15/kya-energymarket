# ADR 0003 — Comptes, organisations et serveur OAuth 2.1 avec Better Auth

- **Statut** : acceptée (spécification 002, 2026-09-26) · **Date** : 2026-09-25

## Contexte

Il faut des comptes clients (courriel et mot de passe, lien de connexion par courriel), des
organisations avec membres et rôles, une administration KYA, et un **serveur d'autorisation OAuth
2.1** pour que Claude et Codex se connectent au serveur MCP. kya-platform s'appuie sur Neon Auth pour
l'identité et sur un courtier OAuth maison pour MCP.

## Options

1. **Better Auth dans l'application** (bibliothèque, données dans notre base Neon) : comptes,
   organisations, rôles, et plugin fournisseur OAuth 2.1 / MCP.
2. Neon Auth (Better Auth géré par Neon) + courtier OAuth maison, comme kya-platform.
3. Service tiers (Clerk, Auth0).

## Décision proposée

Option 1 : un seul système pour les comptes et pour OAuth, dans notre base, sans courtier à écrire.
La spécification 002 vérifie que le plugin OAuth couvre ce qu'exigent les clients MCP visés (PKCE,
métadonnées RFC 8414 et RFC 9728, audience liée à la ressource, enregistrement des clients, refresh
rotatif, révocation) ; sinon on revient à l'option 2.

## Conséquences

- Les sessions web et les jetons MCP sont distincts ; les portées MCP sont les nôtres
  (voir [API et MCP](../architecture/api-et-mcp.md)).
- `BETTER_AUTH_SECRET` et l'URL publique font partie des secrets par environnement.

## Confirmation (spécification 002)

Better Auth 1.7.6 auto-hébergé, données dans Neon (adaptateur Drizzle), plugins `organization`, `admin`
(rôles d'équipe KYA par contrôle d'accès), `magicLink` et cookies TanStack Start. Le skill Neon `neon-auth`
confirme que Neon Auth géré n'offre pas de fournisseur OAuth pour MCP ; `@better-auth/oauth-provider` 1.7.6
servira à la spécification 003.
