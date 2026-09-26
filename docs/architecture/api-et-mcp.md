# API et MCP

Trois portes machine, une seule couche métier. Chaque porte valide ses entrées avec les schémas de
`packages/contracts`, appelle un service de domaine et ne décide jamais seule d'une autorisation.

| Porte | Pour qui | Authentification |
|---|---|---|
| `/api/v1` (REST, OpenAPI) | intégrations, scripts, futures applications | jeton OAuth 2.1 (portées) ou session |
| `/mcp` (Model Context Protocol) | **les administrateurs KYA**, depuis Claude ou Codex | OAuth 2.1 + PKCE, compte de l'équipe KYA obligatoire |
| `/api/software/v1` | les logiciels installés (KYA-SolDesign) | clé de licence ou compte, identifiant de poste ; voir [contrat](contrat-kya-soldesign.md) |
| `/webhooks/<fournisseur>` | Semoa, courriel | signature du fournisseur |

## Serveur MCP

Le serveur MCP est **réservé aux administrateurs de KYA** : il sert à administrer la plateforme depuis
Claude ou Codex. Un compte client est refusé dès la connexion OAuth. Un accès client pourra être
ajouté plus tard, sans rupture, par de nouvelles portées.

- **Transport** : Streamable HTTP sur `/mcp`, sans session serveur, révision 2026-07-28 et, pour les
  clients plus anciens, service sans état 2025 (SDK `@modelcontextprotocol/server` 2). Mis en place par
  la spécification 003 ; guide de connexion : [Connecter Claude ou Codex](../operations/mcp.md).
- **Découverte** : métadonnées de ressource protégée (RFC 9728) sur
  `/.well-known/oauth-protected-resource/mcp` ; métadonnées du serveur d'autorisation (RFC 8414) sur
  `/.well-known/oauth-authorization-server/api/auth` (émetteur `https://<site>/api/auth`), avec les
  variantes `/.well-known/oauth-authorization-server` et `/.well-known/openid-configuration`.
- **Autorisation** : OAuth 2.1 avec PKCE ; enregistrement des clients par documents de métadonnées
  client (CIMD) et, pour les clients actuels, enregistrement dynamique (RFC 7591). Page de
  consentement dans l'application ; jeton d'accès court, lié à la ressource `/mcp` (audience exacte),
  refresh token rotatif, révocation par famille. Jetons et codes stockés sous forme de condensat.
- **Droits** : seuls les comptes ayant un rôle dans l'équipe KYA obtiennent un jeton. Les portées
  limitent ce que le client IA peut demander ; chaque outil vérifie ensuite le rôle de la personne
  (administrateur, ventes, contenus, support). Le consentement n'ouvre jamais un droit métier.
- **Outils** : schémas stricts d'entrée et de sortie, lecture ou écriture déclarée, idempotence pour
  les écritures (`idempotency_key`), confirmation pour les actions à impact, erreurs stables, audit.
  Aucune valeur secrète dans une réponse.
- **Profils** : la liste d'outils visibles dépend des portées accordées et du rôle dans l'équipe KYA.

### Portées prévues

| Portée | Donne accès à |
|---|---|
| `admin:read` | lecture de tout ce que l'équipe KYA administre (catalogue, clients, commandes, licences, support) |
| `admin:customers` | comptes et organisations clientes : consulter, corriger, attribuer ou libérer un poste pour un client |
| `admin:catalog` | créer et modifier logiciels, éditions, durées, prix, essais (outils de la spécification 004) |
| `admin:content` | pages, blocs, Markdown, médias, témoignages (outils de la spécification 004) |
| `admin:sales` | commandes, devis, factures d'achat, remboursements (confirmation) |
| `admin:licenses` | émettre, prolonger, révoquer des licences (confirmation) — outils de la spécification 005 |
| `admin:support` | lire et répondre aux demandes et avis |
| `admin:stats` | statistiques de ventes et d'usage |

### Outils visés (ajoutés spécification par spécification)

- Lecture : `search_catalog`, `get_product`, `find_customer`, `list_licenses`, `list_invoices`,
  `get_order`, `list_support_threads`, `get_sales_stats`, `get_usage_stats`.
- Écriture : `upsert_product`, `upsert_edition`, `set_plan_price`, `configure_trial`,
  `update_page_block`, `publish_page`, `publish_software_release`, `issue_license`,
  `extend_license`, `revoke_license` (confirmation), `create_quote`, `refund_order` (confirmation),
  `reply_support_thread`, `assign_seat`, `release_seat`.

## Clients IA

- **Claude** : ajout du serveur distant `https://<domaine>/mcp` dans Claude (connecteur) ou Claude
  Code ; plus tard, un plugin KYA-EnergyMarket sur le modèle de kya-platform.
- **Codex** : déclaration du serveur MCP distant dans la configuration Codex ; même flux OAuth.
- Aucune clé n'est jamais embarquée dans un client : l'identité vient de la connexion OAuth.

## API REST

Premier point ouvert (spécification 004) : `GET /api/v1/catalog`, public, logiciels visibles et, pour
ceux qui sont disponibles, éditions et durées actives (prix en FCFA entiers, `currency: XOF`,
`indicative` pour un prix exemple).

`/api/v1`, JSON, pagination par curseur, erreurs au format `application/problem+json`, clés
d'idempotence sur les écritures, OpenAPI générée depuis les schémas Zod. Versionnée : une rupture
ouvre `/api/v2`.
