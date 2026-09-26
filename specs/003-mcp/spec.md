# Spécification : Serveur MCP et OAuth (administrateurs KYA)

**Branche** : `feat-003-mcp` · **Dossier** : `specs/003-mcp`
**Créée** : 2026-09-26 · **Statut** : implémentée

**Demande** : phase 3 de la feuille de route. L'équipe KYA administre la plateforme depuis Claude ou
Codex, par un serveur MCP distant protégé par OAuth. Décision déjà prise : **réservé aux
administrateurs KYA** (ADR 0004) — un compte client n'obtient jamais de jeton.

## Scénarios et tests *(obligatoire)*

### Histoire 1 — Connecter Claude ou Codex (P1)

Un administrateur ajoute `https://<site>/mcp` dans Claude (connecteur) ou Codex. Le client découvre
seul le serveur d'autorisation, s'enregistre, ouvre la page de connexion du site, puis la page
d'autorisation ; l'administrateur autorise, le client reçoit un jeton et liste les outils.

**Scénarios d'acceptation** :

1. **Étant donné** `/mcp` sans jeton, **quand** un client l'appelle, **alors** il reçoit `401` avec un
   en-tête `WWW-Authenticate` qui désigne les métadonnées de ressource protégée (RFC 9728).
2. **Étant donné** ces métadonnées, **quand** le client les lit, **alors** elles désignent le serveur
   d'autorisation, dont les métadonnées (RFC 8414) donnent les adresses d'autorisation, de jeton et
   d'enregistrement.
3. **Étant donné** un client sans identifiant, **quand** il s'enregistre (RFC 7591) ou présente un
   document de métadonnées client (CIMD), **alors** il est accepté comme client public avec PKCE.
4. **Étant donné** un administrateur non connecté, **quand** le client ouvre l'autorisation, **alors**
   la page `Se connecter` du site s'affiche, puis, après connexion, la page d'autorisation.
5. **Étant donné** la page d'autorisation, **quand** l'administrateur autorise, **alors** le client
   reçoit un code, l'échange contre un jeton (PKCE) lié à la ressource `/mcp` et peut appeler les outils.

### Histoire 2 — Réservé à l'équipe KYA (P1)

1. **Étant donné** un compte client, **quand** il arrive sur la page d'autorisation, **alors** elle
   annonce « réservé à l'équipe KYA » et ne propose que « Refuser ».
2. **Étant donné** un compte client qui contourne la page, **quand** le client demande un jeton,
   **alors** il est refusé.
3. **Étant donné** un administrateur dont le rôle est retiré, **quand** son client rappelle `/mcp` ou
   rafraîchit son jeton, **alors** l'accès est refusé dès l'appel suivant.

### Histoire 3 — Premiers outils (P1)

1. `whoami` : identité, rôles d'équipe, portées accordées.
2. `list_staff` : membres de l'équipe KYA et leurs rôles.
3. `find_customer` : recherche de comptes par courriel ou nom (nom, courriel, date, organisations
   d'entreprise), 20 résultats au plus.

Chaque appel d'outil est tracé dans l'audit (`mcp.tool_called` : client, outil, résultat).

### Histoire 4 — Guide et connexions dans l'administration (P2)

L'administration affiche l'adresse du serveur MCP, la marche à suivre pour Claude et Codex, et les
clients que la personne a autorisés, avec « Révoquer ».

### Cas limites

- Jeton expiré : `401`, puis rafraîchissement ou nouveau parcours.
- Portée manquante : `403 insufficient_scope` qui nomme la portée.
- Client inconnu, `redirect_uri` non déclarée, PKCE absent : refus du serveur d'autorisation.
- Protocole MCP : révision 2026-07-28 et, pour les clients plus anciens, service sans état 2025.

## Exigences *(obligatoire)*

- **FR-001** : `/mcp` en Streamable HTTP, sans session serveur, révisions 2026-07-28 et 2025 (sans état).
- **FR-002** : OAuth 2.1 + PKCE par Better Auth (`@better-auth/mcp`), jetons JWT signés (JWKS),
  audience exacte `https://<site>/mcp`, jeton d'accès 15 minutes, jeton de rafraîchissement rotatif.
- **FR-003** : Découverte à la racine : `/.well-known/oauth-protected-resource[/mcp]`,
  `/.well-known/oauth-authorization-server[/api/auth]`, `/.well-known/openid-configuration[/api/auth]`.
- **FR-004** : Enregistrement dynamique (RFC 7591) et documents de métadonnées client (CIMD, profil
  MCP 2026-07-28, récupération à DNS résolu une fois et adresse épinglée).
- **FR-005** : Portées : `openid`, `profile`, `email`, `offline_access`, `admin:read`. Les portées
  d'écriture arrivent avec les spécifications qui apportent des outils d'écriture.
- **FR-006** : Seul un compte avec un rôle d'équipe KYA obtient un jeton : page d'autorisation,
  émission du jeton (y compris au rafraîchissement) et chaque appel `/mcp` (rôle relu en base).
- **FR-007** : Outils `whoami`, `list_staff`, `find_customer` : schémas stricts, lecture seule
  déclarée, aucune valeur secrète, audit de chaque appel.
- **FR-008** : Page d'autorisation fidèle à la charte (FR/EN) ; page d'administration « MCP » :
  adresse, guide Claude et Codex, clients autorisés et révocation.
- **FR-009** : Guide de connexion `docs/operations/mcp.md`.

## Critères de succès *(obligatoire)*

- **SC-001** : Un parcours complet (enregistrement, connexion, autorisation, jeton, `tools/list`,
  `tools/call`) passe en test de parcours sur la version construite.
- **SC-002** : Un compte client n'obtient aucun jeton (test).
- **SC-003** : Connexion vérifiée depuis Claude et Codex sur l'environnement `dev` (manuel, guide).

## Hypothèses

- Les clients IA visés gèrent la découverte OAuth MCP (RFC 9728) et l'enregistrement dynamique ou CIMD.
- Un seul serveur d'autorisation : l'application elle-même (`/api/auth`).
