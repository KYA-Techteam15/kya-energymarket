# Recherche — MCP et OAuth

Date : 2026-09-26.

- **`@better-auth/mcp` 1.7.6** : le fournisseur OAuth 2.1 / OIDC de Better Auth réglé pour MCP. Il lie
  les jetons à la ressource `resource` (RFC 8707), sert les métadonnées de ressource protégée
  (RFC 9728) et fournit `requireMcpAuth` (vérification du JWT par JWKS : signature, émetteur,
  audience, expiration ; réponses `401`/`403` avec `WWW-Authenticate`). Il remplace l'ancien plugin
  `mcp` de `better-auth/plugins` et exige le plugin `jwt()` (clés dans la table `jwks`).
- **`@better-auth/cimd`** : documents de métadonnées client (l'identifiant du client est une URL
  HTTPS). Profil `mcp-2026-07-28` ; transport `@better-auth/cimd/node` (DNS résolu une fois,
  adresses spéciales refusées, pas de redirection) contre les attaques SSRF.
- **Enregistrement dynamique** : `allowDynamicClientRegistration` et
  `allowUnauthenticatedClientRegistration` (les clients MCP s'enregistrent avant toute connexion ;
  ce sont des clients publics, PKCE obligatoire).
- **Connexion pendant l'autorisation** : Better Auth renvoie vers `loginPage` avec une requête
  signée ; le client navigateur (`oauthProviderClient`) joint cette requête à la connexion et la
  réponse porte l'adresse où poursuivre. Même mécanisme pour `oauth2/consent`.
- **Restreindre aux administrateurs** : `customAccessTokenClaims` est appelé à chaque émission (code
  et rafraîchissement) ; y lever une erreur refuse le jeton. Le rôle est aussi relu à chaque appel.
- **`@modelcontextprotocol/server` 2.1** (SDK v2) : `createMcpHandler(fabrique)` sert la révision
  2026-07-28 et, par défaut, les clients 2025 sans état ; `authInfo` est transmis à la fabrique.
- **Découverte à la racine** : les clients demandent les métadonnées à la racine du site
  (`/.well-known/...`), hors du `basePath` `/api/auth` : une route racine transmet ces requêtes au
  gestionnaire Better Auth, qui les reconnaît par leur chemin.
