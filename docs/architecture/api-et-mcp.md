# API et MCP

Trois portes machine, une seule couche métier. Chaque porte valide ses entrées avec les schémas de
`packages/contracts`, appelle un service de domaine et ne décide jamais seule d'une autorisation.

| Porte | Pour qui | Authentification |
|---|---|---|
| `/api/v1` (REST, OpenAPI) | intégrations, scripts, futures applications | jeton OAuth 2.1 (portées) ou session |
| `/mcp` (Model Context Protocol) | Claude, Codex et autres clients IA | OAuth 2.1 + PKCE |
| `/api/software/v1` | les logiciels installés (KYA-SolDesign) | clé de licence ou compte, identifiant de poste ; voir [contrat](contrat-kya-soldesign.md) |
| `/webhooks/<fournisseur>` | Semoa, courriel | signature du fournisseur |

## Serveur MCP

- **Transport** : Streamable HTTP sur `/mcp`, sans session serveur, révision du protocole la plus
  récente prise en charge par les clients visés (à fixer dans la spécification MCP).
- **Découverte** : métadonnées de ressource protégée (RFC 9728) sur
  `/.well-known/oauth-protected-resource/mcp` ; métadonnées du serveur d'autorisation (RFC 8414) sur
  `/.well-known/oauth-authorization-server`.
- **Autorisation** : OAuth 2.1 avec PKCE ; enregistrement des clients par documents de métadonnées
  client (CIMD) et, pour les clients actuels, enregistrement dynamique (RFC 7591). Page de
  consentement dans l'application ; jeton d'accès court, lié à la ressource `/mcp` (audience exacte),
  refresh token rotatif, révocation par famille. Jetons et codes stockés sous forme de condensat.
- **Droits** : les portées limitent ce qu'un client peut demander ; chaque outil vérifie ensuite le
  rôle de la personne dans l'organisation active. Le consentement n'ouvre jamais un droit métier.
- **Outils** : schémas stricts d'entrée et de sortie, lecture ou écriture déclarée, idempotence pour
  les écritures (`idempotency_key`), confirmation pour les actions à impact, erreurs stables, audit.
  Aucune valeur secrète dans une réponse.
- **Profils** : la liste d'outils visibles dépend des portées accordées et du rôle (client ou équipe
  KYA).

### Portées prévues

| Portée | Donne accès à |
|---|---|
| `catalog:read` | logiciels, éditions, prix, versions publiées |
| `account:read` | mon organisation, mes licences, mes factures d'achat, mes demandes |
| `licenses:manage` | attribuer et libérer des postes de mes licences |
| `support:write` | créer une demande, répondre |
| `admin:catalog` | créer et modifier logiciels, éditions, durées, prix, essais |
| `admin:content` | pages, blocs, Markdown, médias, témoignages |
| `admin:sales` | commandes, devis, factures d'achat, remboursements (confirmation) |
| `admin:licenses` | émettre, prolonger, révoquer des licences (confirmation) |
| `admin:support` | lire et répondre aux demandes et avis |
| `admin:stats` | statistiques de ventes et d'usage |

### Outils visés (ajoutés spécification par spécification)

- Lecture : `search_catalog`, `get_product`, `list_my_licenses`, `list_my_invoices`,
  `get_order`, `list_support_threads`, `get_sales_stats`, `get_usage_stats`.
- Écriture client : `assign_seat`, `release_seat`, `create_support_thread`, `reply_support_thread`.
- Écriture administration : `upsert_product`, `upsert_edition`, `set_plan_price`, `configure_trial`,
  `update_page_block`, `publish_page`, `publish_software_release`, `issue_license`,
  `extend_license`, `revoke_license` (confirmation), `create_quote`, `refund_order` (confirmation),
  `reply_support_thread`.

## Clients IA

- **Claude** : ajout du serveur distant `https://<domaine>/mcp` dans Claude (connecteur) ou Claude
  Code ; plus tard, un plugin KYA-EnergyMarket sur le modèle de kya-platform.
- **Codex** : déclaration du serveur MCP distant dans la configuration Codex ; même flux OAuth.
- Aucune clé n'est jamais embarquée dans un client : l'identité vient de la connexion OAuth.

## API REST

`/api/v1`, JSON, pagination par curseur, erreurs au format `application/problem+json`, clés
d'idempotence sur les écritures, OpenAPI générée depuis les schémas Zod. Versionnée : une rupture
ouvre `/api/v2`.
